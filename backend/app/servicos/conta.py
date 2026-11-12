"""Direitos do titular (LGPD, art. 18): ver uma cópia de tudo o que o servidor guarda da pessoa e apagar a conta.
E a retenção: o que o servidor apaga sozinho, nos prazos de app/legal.py."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from app.legal import RETENCAO_NOTIFICACOES, RETENCAO_STORIES
from app.modelos import (
    Assinatura, Bloqueio, Clube, Comentario, Consentimento, Curtida, DadoUsuario, Denuncia, Membro, Notificacao, Penalidade, Post, RedefinicaoSenha, Seguidor, Story, StoryReacao, StoryVisto, Usuario,
)
from app.servicos import midia as servico_midia
from app.servicos.busca import normalizar


def _data(x) -> str | None:
    return x.isoformat() if x else None


def exportar(sessao: Session, u: Usuario) -> dict:
    """Tudo o que está no servidor e é da pessoa, num JSON só. Os recados de voz não entram: ficam só no aparelho."""
    uid = u.id
    todos = lambda modelo, *cond: list(sessao.scalars(select(modelo).where(*cond)))
    return {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "conta": {
            "email": u.email, "nome": u.nome, "arroba": u.arroba, "bio": u.bio, "foto": u.foto, "nascimento": _data(u.nascimento),
            "papel": u.papel, "pro": u.pro, "selo": u.selo, "marketing": u.marketing, "criado_em": _data(u.criado_em),
        },
        "dados_do_app": {d.chave: d.valor for d in todos(DadoUsuario, DadoUsuario.usuario_id == uid)},
        "politica_de_conteudo": {
            "avisos": u.avisos, "suspensoes": u.suspensoes, "suspenso_ate": _data(u.suspenso_ate), "banido": u.banido,
            "historico": [{"tipo": x.tipo, "motivo": x.motivo, "trecho": x.trecho, "em": _data(x.em)} for x in todos(Penalidade, Penalidade.usuario_id == uid)],
        },
        "publicacoes": [
            {"id": p.id, "texto": p.texto, "destaque": p.destaque, "midia": p.midia, "clube_id": p.clube_id, "criado_em": _data(p.criado_em)}
            for p in todos(Post, Post.autor_id == uid)
        ],
        "comentarios": [
            {"id": c.id, "post_id": c.post_id, "texto": c.texto, "criado_em": _data(c.criado_em)}
            for c in todos(Comentario, Comentario.autor_id == uid)
        ],
        "cheers_dados": [c.post_id for c in todos(Curtida, Curtida.usuario_id == uid)],
        "seguindo": [s.seguido_id for s in todos(Seguidor, Seguidor.seguidor_id == uid)],
        "seguidores": [s.seguidor_id for s in todos(Seguidor, Seguidor.seguido_id == uid)],
        "clubes_criados": [{"id": c.id, "nome": c.nome, "descricao": c.descricao} for c in todos(Clube, Clube.dono_id == uid)],
        "clubes_em_que_participa": [m.clube_id for m in todos(Membro, Membro.usuario_id == uid)],
        "stories_no_ar": [
            {"id": s.id, "texto": s.texto, "legenda": s.legenda, "midia": s.midia, "criado_em": _data(s.criado_em)}
            for s in todos(Story, Story.autor_id == uid)
        ],
        "notificacoes": [
            {"tipo": n.tipo, "de_usuario_id": n.ator_id, "post_id": n.post_id, "lida": n.lida, "criado_em": _data(n.criado_em)}
            for n in todos(Notificacao, Notificacao.usuario_id == uid)
        ],
        "assinaturas": [
            {"plano": a.plano_id, "status": a.status, "criado_em": _data(a.criado_em)} for a in todos(Assinatura, Assinatura.usuario_id == uid)
        ],
        "consentimentos": [
            {"tipo": c.tipo, "versao": c.versao, "aceito": c.aceito, "origem": c.origem, "detalhe": c.detalhe, "em": _data(c.em)}
            for c in todos(Consentimento, Consentimento.usuario_id == uid)
        ],
    }


def apagar_conta(sessao: Session, u: Usuario) -> None:
    """Apaga a conta e tudo o que pende dela, inclusive as fotos no Storage. Não dá para desfazer.
    Faz na mão o que o CASCADE do Postgres faria (o SQLite dos testes não aplica sozinho)."""
    from app.rotas.social import apagar_posts   # aqui dentro: evita import circular

    uid = u.id
    meus_clubes = list(sessao.scalars(select(Clube.id).where(Clube.dono_id == uid)))
    posts = set(sessao.scalars(select(Post.id).where(or_(Post.autor_id == uid, Post.clube_id.in_(meus_clubes)))))
    apagar_posts(sessao, list(posts))
    for m in sessao.scalars(select(Story.midia).where(Story.autor_id == uid)):
        if m and m.get("url"):
            servico_midia.apagar_arquivos([m["url"]])
    if u.foto:
        servico_midia.apagar_arquivos([u.foto])
    meus_stories = select(Story.id).where(Story.autor_id == uid)
    for tabela in (StoryVisto, StoryReacao):   # o que as pessoas fizeram nos seus stories, e o que você fez nos dos outros
        sessao.execute(delete(tabela).where(or_(tabela.story_id.in_(meus_stories), tabela.usuario_id == uid)))
    sessao.execute(delete(Story).where(Story.autor_id == uid))
    sessao.execute(delete(Comentario).where(Comentario.autor_id == uid))
    sessao.execute(delete(Curtida).where(Curtida.usuario_id == uid))
    sessao.execute(delete(Seguidor).where(or_(Seguidor.seguidor_id == uid, Seguidor.seguido_id == uid)))
    sessao.execute(delete(Notificacao).where(or_(Notificacao.usuario_id == uid, Notificacao.ator_id == uid)))
    sessao.execute(delete(Membro).where(or_(Membro.usuario_id == uid, Membro.clube_id.in_(meus_clubes))))
    sessao.execute(delete(Clube).where(Clube.id.in_(meus_clubes)))
    sessao.execute(delete(DadoUsuario).where(DadoUsuario.usuario_id == uid))
    sessao.execute(delete(Consentimento).where(Consentimento.usuario_id == uid))
    sessao.execute(delete(RedefinicaoSenha).where(RedefinicaoSenha.usuario_id == uid))
    sessao.execute(delete(Penalidade).where(Penalidade.usuario_id == uid))
    sessao.execute(delete(Bloqueio).where(or_(Bloqueio.quem_id == uid, Bloqueio.bloqueado_id == uid)))
    sessao.execute(delete(Denuncia).where(Denuncia.denunciante_id == uid))
    # as denúncias contra a pessoa ficam (para o histórico da moderação), sem apontar para a conta apagada
    sessao.execute(update(Denuncia).where(Denuncia.autor_id == uid).values(autor_id=None))
    # pedidos de assinatura ficam sem dono (sem dado pessoal): o histórico de cobrança pode ser exigido por lei
    sessao.execute(update(Assinatura).where(Assinatura.usuario_id == uid).values(usuario_id=None))
    sessao.delete(u)
    sessao.commit()


_ultima_limpeza: datetime | None = None


def limpar_vencidos(sessao: Session, forcar: bool = False) -> None:
    """Retenção: apaga stories com mais de 24 horas (e as fotos deles) e avisos com mais de 180 dias.
    Roda no máximo uma vez a cada 10 minutos por processo, pegando carona nas leituras."""
    global _ultima_limpeza
    agora = datetime.now(timezone.utc)
    if not forcar and _ultima_limpeza and (agora - _ultima_limpeza).total_seconds() < 600:
        return
    _ultima_limpeza = agora
    velhos = list(sessao.scalars(select(Story).where(Story.criado_em < agora - RETENCAO_STORIES)))
    for s in velhos:
        sessao.execute(delete(StoryVisto).where(StoryVisto.story_id == s.id))
        sessao.execute(delete(StoryReacao).where(StoryReacao.story_id == s.id))
        if s.midia and s.midia.get("url"):
            servico_midia.apagar_arquivos([s.midia["url"]])
        sessao.delete(s)
    sessao.execute(delete(Notificacao).where(Notificacao.criado_em < agora - RETENCAO_NOTIFICACOES))
    sessao.execute(delete(RedefinicaoSenha).where(RedefinicaoSenha.criado_em < agora - timedelta(days=1)))   # códigos de redefinição velhos, usados ou não
    sessao.commit()


MSG_NOME_EM_USO = "Já existe uma conta com esse nome. Escolha outro, por exemplo com o sobrenome."


def nome_em_uso(sessao: Session, nome: str, ignorar_id: int | None = None) -> bool:
    """Já tem uma conta com esse nome? Compara sem maiúscula, sem acento e sem espaço sobrando: "Vinícius  Silva" e "vinicius silva" são o mesmo nome."""
    alvo = normalizar(nome)
    if not alvo:
        return False
    consulta = select(Usuario.id, Usuario.nome).where(Usuario.busca.contains(alvo, autoescape=True))
    if ignorar_id is not None:
        consulta = consulta.where(Usuario.id != ignorar_id)
    return any(normalizar(n) == alvo for _, n in sessao.execute(consulta))
