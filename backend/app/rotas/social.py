"""Feed, publicações, curtidas, comentários, notificações e o resumo da pessoa logada."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import StatusOut
from app.esquemas_social import (
    ComentarioIn, ComentarioOut, NotificacaoOut, PaginaComentarios, PaginaNotificacoes, PaginaPosts, PostIn,
    PostOut, ResumoOut,
)
from app.modelos import Clube, Comentario, Curtida, Membro, Notificacao, Post, Seguidor, Usuario
from app.servicos import midia as servico_midia
from app.servicos.social import (
    TEXTOS, clube_visivel, condicao_post_visivel, limite_valido, montar_posts, ms, notificar, pagina_de_posts,
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
    consulta = select(Comentario).where(Comentario.post_id == post_id)
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

def _contar(sessao: Session, consulta) -> int:
    return sessao.scalar(select(func.count()).select_from(consulta.subquery())) or 0


@router.get("/resumo", response_model=ResumoOut)
def resumo(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    uid = usuario.id
    return ResumoOut(
        id=uid,
        posts=_contar(sessao, select(Post.id).where(Post.autor_id == uid)),
        cheers_dados=_contar(sessao, select(Curtida.post_id).where(Curtida.usuario_id == uid)),
        seguindo=_contar(sessao, select(Seguidor.seguido_id).where(Seguidor.seguidor_id == uid)),
        seguidores=_contar(sessao, select(Seguidor.seguidor_id).where(Seguidor.seguido_id == uid)),
        comentarios=_contar(sessao, select(Comentario.id).where(Comentario.autor_id == uid)),
        clubes_criados=_contar(sessao, select(Clube.id).where(Clube.dono_id == uid)),
        clubes=list(sessao.scalars(select(Membro.clube_id).where(Membro.usuario_id == uid))),
        nao_lidas=_contar(sessao, select(Notificacao.id).where(Notificacao.usuario_id == uid, Notificacao.lida.is_(False))),
    )
