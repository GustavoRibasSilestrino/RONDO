"""Feed, publicações, curtidas, comentários, notificações e o resumo da pessoa logada."""
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import StatusOut
from app.esquemas_social import (
    ComentarioIn, ComentarioOut, NotificacaoOut, PaginaComentarios, PaginaNotificacoes, PaginaPosts, PostIn,
    PaginaVisualizacoes, ReacaoStoryIn, StoriesDaPessoa, StoriesOut, StoryIn, StoryOut, VisualizacaoOut,
    PostOut, ResumoOut,
)
from app.modelos import Clube, Comentario, Curtida, Membro, Notificacao, Post, Seguidor, Story, StoryReacao, StoryVisto, Usuario
from app.servicos import conta as servico_conta
from app.servicos import midia as servico_midia
from app.servicos.social import (
    TEXTOS, bloqueados, clube_visivel, denunciados, condicao_post_visivel, limite_valido, montar_posts, ms, notificar, pagina_de_posts,
    pessoas_out, post_visivel,
)

router = APIRouter(prefix="/social", tags=["social"])


@router.get("/feed", response_model=PaginaPosts)
def feed(
    filtro: Literal["todos", "seguindo", "clubes", "geral"] = "todos",
    clube_id: int | None = None,
    antes: int | None = None,
    limite: int = Query(20, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    consulta = select(Post).where(condicao_post_visivel(usuario.id))
    if clube_id is not None:
        clube_visivel(sessao, usuario.id, clube_id)
        consulta = consulta.where(Post.clube_id == clube_id)
    elif filtro == "seguindo":
        consulta = consulta.where(Post.autor_id.in_(select(Seguidor.seguido_id).where(Seguidor.seguidor_id == usuario.id)))
    elif filtro == "geral":
        consulta = consulta.where(Post.clube_id.is_(None))
    elif filtro == "clubes":
        consulta = consulta.where(Post.clube_id.in_(select(Membro.clube_id).where(Membro.usuario_id == usuario.id)))
    itens, proximo = pagina_de_posts(sessao, usuario.id, consulta, antes, limite)
    return PaginaPosts(itens=itens, proximo=proximo)


@router.post("/posts", response_model=PostOut, status_code=201)
def publicar(dados: PostIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    if dados.clube_id is not None:
        clube_visivel(sessao, usuario.id, dados.clube_id)
        if not sessao.get(Membro, (dados.clube_id, usuario.id)):
            raise HTTPException(403, "Entre no clube para publicar nele.")
    post = Post(autor_id=usuario.id, clube_id=dados.clube_id, texto=dados.texto, destaque=dados.destaque or None, midia=_midia_valida(dados.midia, usuario.id))
    sessao.add(post)
    sessao.commit()
    return montar_posts(sessao, usuario.id, [post])[0]


def _midia_valida(itens: list[dict] | None, uid: int) -> list[dict] | None:
    """Só guarda os campos conhecidos. Uma URL só vale se for do nosso Storage e da própria pessoa (nada de link externo)."""
    if not itens:
        return None
    saida = []
    for m in itens:
        if m.get("tipo") not in ("imagem", "video") or not isinstance(m.get("id"), str) or len(m["id"]) > 40:
            raise HTTPException(422, "Mídia inválida.")
        item = {"id": m["id"], "tipo": m["tipo"]}
        for k in ("largura", "altura", "duracao"):
            if isinstance(m.get(k), (int, float)) and not isinstance(m.get(k), bool):
                item[k] = int(m[k])
        url = m.get("url")
        if url is not None:
            if not (servico_midia.configurado() and isinstance(url, str) and url.startswith(f"{servico_midia.prefixo_publico()}{uid}/") and len(url) <= 300):
                raise HTTPException(422, "Endereço de mídia inválido.")
            item["url"] = url
        saida.append(item)
    return saida


@router.delete("/posts/{post_id}", response_model=StatusOut)
def apagar_post(post_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    post = post_visivel(sessao, usuario.id, post_id)
    if post.autor_id != usuario.id:
        raise HTTPException(403, "Só quem publicou pode apagar.")
    apagar_posts(sessao, [post.id])
    sessao.commit()
    return StatusOut(status="ok")


def apagar_posts(sessao: Session, ids: list[int]) -> None:
    """Apaga as publicações e tudo o que pende delas (o SQLite dos testes não aplica o CASCADE sozinho)."""
    if not ids:
        return
    for m in sessao.scalars(select(Post.midia).where(Post.id.in_(ids))):
        servico_midia.apagar_arquivos([x["url"] for x in m or [] if x.get("url")])
    sessao.execute(delete(Notificacao).where(Notificacao.post_id.in_(ids)))
    sessao.execute(delete(Comentario).where(Comentario.post_id.in_(ids)))
    sessao.execute(delete(Curtida).where(Curtida.post_id.in_(ids)))
    sessao.execute(delete(Post).where(Post.id.in_(ids)))


# ---------- curtidas ----------

def _estado_curtida(sessao: Session, uid: int, post: Post) -> PostOut:
    return montar_posts(sessao, uid, [post])[0]


@router.put("/posts/{post_id}/curtida", response_model=PostOut)
def curtir(post_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    post = post_visivel(sessao, usuario.id, post_id)
    if not sessao.get(Curtida, (post.id, usuario.id)):
        sessao.add(Curtida(post_id=post.id, usuario_id=usuario.id))
        notificar(sessao, post.autor_id, usuario, "cheers", post.id)
        sessao.commit()
    return _estado_curtida(sessao, usuario.id, post)


@router.delete("/posts/{post_id}/curtida", response_model=PostOut)
def descurtir(post_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    post = post_visivel(sessao, usuario.id, post_id)
    curtida = sessao.get(Curtida, (post.id, usuario.id))
    if curtida:
        sessao.delete(curtida)
        sessao.execute(delete(Notificacao).where(Notificacao.post_id == post.id, Notificacao.ator_id == usuario.id, Notificacao.tipo == "cheers"))
        sessao.commit()
    return _estado_curtida(sessao, usuario.id, post)


# ---------- comentários ----------

def _comentarios_out(sessao: Session, uid: int, linhas: list[Comentario]) -> list[ComentarioOut]:
    pessoas = pessoas_out(sessao, uid, {c.autor_id for c in linhas})
    return [ComentarioOut(id=c.id, autor=pessoas[c.autor_id], texto=c.texto, quando=ms(c.criado_em), meu=c.autor_id == uid) for c in linhas]


@router.get("/posts/{post_id}/comentarios", response_model=PaginaComentarios)
def listar_comentarios(
    post_id: int,
    depois: int | None = None,
    limite: int = Query(30, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    """Do mais antigo para o mais novo; `depois` é o id do último comentário já recebido."""
    post_visivel(sessao, usuario.id, post_id)
    limite = limite_valido(limite)
    consulta = select(Comentario).where(Comentario.post_id == post_id, Comentario.autor_id.not_in(bloqueados(usuario.id)), Comentario.id.not_in(denunciados(usuario.id, "comentario")))
    if depois:
        consulta = consulta.where(Comentario.id > depois)
    linhas = list(sessao.scalars(consulta.order_by(Comentario.id).limit(limite + 1)))
    proximo = linhas[limite - 1].id if len(linhas) > limite else None
    return PaginaComentarios(itens=_comentarios_out(sessao, usuario.id, linhas[:limite]), proximo=proximo)


@router.post("/posts/{post_id}/comentarios", response_model=ComentarioOut, status_code=201)
def comentar(post_id: int, dados: ComentarioIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    post = post_visivel(sessao, usuario.id, post_id)
    c = Comentario(post_id=post.id, autor_id=usuario.id, texto=dados.texto)
    sessao.add(c)
    notificar(sessao, post.autor_id, usuario, "comentario", post.id)
    sessao.commit()
    return _comentarios_out(sessao, usuario.id, [c])[0]


@router.delete("/comentarios/{comentario_id}", response_model=StatusOut)
def apagar_comentario(comentario_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    c = sessao.get(Comentario, comentario_id)
    if not c:
        raise HTTPException(404, "Comentário não encontrado.")
    post_visivel(sessao, usuario.id, c.post_id)
    if c.autor_id != usuario.id:
        raise HTTPException(403, "Só quem comentou pode apagar.")
    sessao.delete(c)
    sessao.commit()
    return StatusOut(status="ok")


# ---------- notificações ----------

@router.get("/notificacoes", response_model=PaginaNotificacoes)
def listar_notificacoes(
    antes: int | None = None,
    limite: int = Query(30, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    servico_conta.limpar_vencidos(sessao)   # retenção: avisos com mais de 180 dias saem do banco
    limite = limite_valido(limite)
    consulta = select(Notificacao).where(Notificacao.usuario_id == usuario.id)
    if antes:
        consulta = consulta.where(Notificacao.id < antes)
    linhas = list(sessao.scalars(consulta.order_by(Notificacao.id.desc()).limit(limite + 1)))
    proximo = linhas[limite - 1].id if len(linhas) > limite else None
    linhas = linhas[:limite]
    pessoas = pessoas_out(sessao, usuario.id, {n.ator_id for n in linhas})
    itens = [
        NotificacaoOut(id=n.id, tipo=n.tipo, texto=TEXTOS.get(n.tipo, "{nome}").format(nome=pessoas[n.ator_id].nome), ator=pessoas[n.ator_id], post_id=n.post_id, quando=ms(n.criado_em), lida=n.lida)
        for n in linhas
    ]
    return PaginaNotificacoes(itens=itens, proximo=proximo)


@router.post("/notificacoes/lidas", response_model=StatusOut)
def marcar_lidas(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    for n in sessao.scalars(select(Notificacao).where(Notificacao.usuario_id == usuario.id, Notificacao.lida.is_(False))):
        n.lida = True
    sessao.commit()
    return StatusOut(status="ok")


@router.delete("/notificacoes", response_model=StatusOut)
def limpar_notificacoes(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    sessao.execute(delete(Notificacao).where(Notificacao.usuario_id == usuario.id))
    sessao.commit()
    return StatusOut(status="ok")


# ---------- resumo: o que alimenta nível e medalhas ----------

def _total(consulta):
    """Uma contagem como subconsulta: todas as contagens do resumo saem numa ida só ao banco."""
    return select(func.count()).select_from(consulta.subquery()).scalar_subquery()


@router.get("/resumo", response_model=ResumoOut)
def resumo(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """É chamado com frequência pelo app: 2 consultas no total (as contagens juntas e a lista de clubes)."""
    uid = usuario.id
    c = sessao.execute(select(
        _total(select(Post.id).where(Post.autor_id == uid)),
        _total(select(Curtida.post_id).where(Curtida.usuario_id == uid)),
        _total(select(Seguidor.seguido_id).where(Seguidor.seguidor_id == uid)),
        _total(select(Seguidor.seguidor_id).where(Seguidor.seguido_id == uid)),
        _total(select(Comentario.id).where(Comentario.autor_id == uid)),
        _total(select(Clube.id).where(Clube.dono_id == uid)),
        _total(select(Notificacao.id).where(Notificacao.usuario_id == uid, Notificacao.lida.is_(False))),
    )).one()
    return ResumoOut(
        id=uid, posts=c[0], cheers_dados=c[1], seguindo=c[2], seguidores=c[3], comentarios=c[4], clubes_criados=c[5],
        clubes=list(sessao.scalars(select(Membro.clube_id).where(Membro.usuario_id == uid))), nao_lidas=c[6],
    )


# ---------- stories: 24 horas no ar, só para quem segue o autor ----------

DURACAO_STORY = timedelta(hours=24)


def _story_out(s: Story) -> StoryOut:
    return StoryOut(id=s.id, texto=s.texto, fundo=s.fundo, legenda=s.legenda, midia=s.midia, quando=ms(s.criado_em))


@router.post("/stories", response_model=StoryOut, status_code=201)
def publicar_story(dados: StoryIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    midia = _midia_valida([dados.midia], usuario.id) if dados.midia else None
    s = Story(autor_id=usuario.id, texto=dados.texto, fundo=dados.fundo, legenda=dados.legenda, midia=midia[0] if midia else None)
    sessao.add(s)
    sessao.commit()
    return _story_out(s)


@router.get("/stories", response_model=StoriesOut)
def stories_no_ar(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Os seus e os de quem você segue, dos últimos 24 horas. Quem você não segue não aparece."""
    servico_conta.limpar_vencidos(sessao)   # retenção: os de mais de 24 horas saem do banco
    desde = datetime.now(timezone.utc) - DURACAO_STORY
    sigo = select(Seguidor.seguido_id).where(Seguidor.seguidor_id == usuario.id)
    linhas = list(sessao.scalars(
        select(Story).where(Story.criado_em >= desde, or_(Story.autor_id == usuario.id, Story.autor_id.in_(sigo)), Story.autor_id.not_in(bloqueados(usuario.id)), Story.id.not_in(denunciados(usuario.id, "story"))).order_by(Story.id)
    ))
    por_autor: dict[int, list[Story]] = {}
    for s in linhas:
        por_autor.setdefault(s.autor_id, []).append(s)
    pessoas = pessoas_out(sessao, usuario.id, set(por_autor))
    # você primeiro; os outros, do story mais recente para o mais antigo
    ordem = sorted(por_autor, key=lambda a: (a != usuario.id, -por_autor[a][-1].id))

    # quem viu e quem reagiu aos seus; a sua reação aos dos outros
    meus_ids = [s.id for s in por_autor.get(usuario.id, [])]
    n_vistos = dict(sessao.execute(select(StoryVisto.story_id, func.count()).where(StoryVisto.story_id.in_(meus_ids)).group_by(StoryVisto.story_id)).all()) if meus_ids else {}
    n_reacoes = dict(sessao.execute(select(StoryReacao.story_id, func.count()).where(StoryReacao.story_id.in_(meus_ids)).group_by(StoryReacao.story_id)).all()) if meus_ids else {}
    ultimos: dict[int, list[int]] = {}
    for sid in meus_ids:
        ultimos[sid] = list(sessao.scalars(select(StoryVisto.usuario_id).where(StoryVisto.story_id == sid).order_by(StoryVisto.em.desc(), StoryVisto.usuario_id.desc()).limit(3)))
    quem = pessoas_out(sessao, usuario.id, {u for lista in ultimos.values() for u in lista})
    todos_ids = [s.id for s in linhas]
    minhas = dict(sessao.execute(select(StoryReacao.story_id, StoryReacao.tipo).where(StoryReacao.usuario_id == usuario.id, StoryReacao.story_id.in_(todos_ids))).all()) if todos_ids else {}

    def saida(s: Story) -> StoryOut:
        o = _story_out(s)
        if s.autor_id == usuario.id:
            o.visualizacoes = n_vistos.get(s.id, 0)
            o.reacoes = n_reacoes.get(s.id, 0)
            o.vistos = [quem[u] for u in ultimos.get(s.id, []) if u in quem]
        else:
            o.minha_reacao = minhas.get(s.id)
        return o

    return StoriesOut(pessoas=[StoriesDaPessoa(autor=pessoas[a], itens=[saida(s) for s in por_autor[a]]) for a in ordem])


def _story_visivel(sessao: Session, uid: int, story_id: int) -> Story:
    """O story, se está no ar e a pessoa pode ver (é dela ou ela segue o autor); senão 404."""
    s = sessao.get(Story, story_id)
    desde = datetime.now(timezone.utc) - DURACAO_STORY
    if not s or (s.criado_em if s.criado_em.tzinfo else s.criado_em.replace(tzinfo=timezone.utc)) < desde:
        raise HTTPException(404, "Story não encontrado.")
    if s.autor_id != uid and not sessao.get(Seguidor, (uid, s.autor_id)):
        raise HTTPException(404, "Story não encontrado.")
    return s


@router.post("/stories/{story_id}/visto", response_model=StatusOut)
def marcar_story_visto(story_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Registra que a pessoa viu o story (o autor vê quem foi). Repetir não duplica; ver o próprio story não conta."""
    s = _story_visivel(sessao, usuario.id, story_id)
    if s.autor_id != usuario.id and not sessao.get(StoryVisto, (s.id, usuario.id)):
        sessao.add(StoryVisto(story_id=s.id, usuario_id=usuario.id))
        sessao.commit()
    return StatusOut(status="ok")


@router.put("/stories/{story_id}/reacao", response_model=StatusOut)
def reagir_ao_story(story_id: int, dados: ReacaoStoryIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    s = _story_visivel(sessao, usuario.id, story_id)
    if s.autor_id == usuario.id:
        raise HTTPException(422, "Você não pode reagir ao seu próprio story.")
    atual = sessao.get(StoryReacao, (s.id, usuario.id))
    if atual:
        atual.tipo = dados.tipo
    else:
        sessao.add(StoryReacao(story_id=s.id, usuario_id=usuario.id, tipo=dados.tipo))
    if not sessao.get(StoryVisto, (s.id, usuario.id)):
        sessao.add(StoryVisto(story_id=s.id, usuario_id=usuario.id))   # quem reage, viu
    sessao.commit()
    return StatusOut(status="ok")


@router.delete("/stories/{story_id}/reacao", response_model=StatusOut)
def tirar_reacao_do_story(story_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    s = _story_visivel(sessao, usuario.id, story_id)
    atual = sessao.get(StoryReacao, (s.id, usuario.id))
    if atual:
        sessao.delete(atual)
        sessao.commit()
    return StatusOut(status="ok")


@router.get("/stories/{story_id}/visualizacoes", response_model=PaginaVisualizacoes)
def quem_viu_o_story(
    story_id: int, limite: int = Query(50, ge=1, le=100),
    usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao),
):
    """Só o autor vê quem viu o story, com a reação de cada um. Os mais recentes primeiro."""
    s = sessao.get(Story, story_id)
    if not s or s.autor_id != usuario.id:
        raise HTTPException(404, "Story não encontrado.")
    total = sessao.scalar(select(func.count()).select_from(StoryVisto).where(StoryVisto.story_id == s.id)) or 0
    vistos = list(sessao.scalars(select(StoryVisto).where(StoryVisto.story_id == s.id).order_by(StoryVisto.em.desc(), StoryVisto.usuario_id.desc()).limit(limite)))
    pessoas = pessoas_out(sessao, usuario.id, {v.usuario_id for v in vistos})
    reacoes = dict(sessao.execute(select(StoryReacao.usuario_id, StoryReacao.tipo).where(StoryReacao.story_id == s.id)).all())
    return PaginaVisualizacoes(
        total=total,
        itens=[VisualizacaoOut(pessoa=pessoas[v.usuario_id], reacao=reacoes.get(v.usuario_id), quando=ms(v.em)) for v in vistos if v.usuario_id in pessoas],
    )


@router.delete("/stories/{story_id}", response_model=StatusOut)
def apagar_story(story_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    s = sessao.get(Story, story_id)
    if not s or s.autor_id != usuario.id:
        raise HTTPException(404, "Story não encontrado.")   # de outra pessoa: nem confirma que existe
    if s.midia and s.midia.get("url"):
        servico_midia.apagar_arquivos([s.midia["url"]])
    sessao.execute(delete(StoryVisto).where(StoryVisto.story_id == s.id))
    sessao.execute(delete(StoryReacao).where(StoryReacao.story_id == s.id))
    sessao.delete(s)
    sessao.commit()
    return StatusOut(status="ok")
