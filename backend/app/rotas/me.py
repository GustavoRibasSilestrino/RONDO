"""Tudo o que é da própria pessoa logada: os dados do app (treinos, dieta, água...) e o perfil."""
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import DadosIn, DadosOut, PerfilIn, UsuarioOut
from app.modelos import DadoUsuario, Usuario

router = APIRouter(prefix="/me", tags=["me"])

# o que o app pode guardar. `xpExtra` e `pro` ficam de fora de propósito: quem define é o servidor (papel, selo e PRO)
CHAVES = {
    "perfil", "treinos", "treinoAtual", "rotinasProprias", "refeicoes", "agua", "checkins", "pesos",
    "perfilSocial",
    "recados", "notificacoes", "profissionais", "storiesVistos", "tema", "nivelAvisado", "medalhasAvisadas",
}
# chaves que o app já mandou e não manda mais: são ignoradas em silêncio, para um app antigo não ter a sincronia
# inteira recusada. Os stories agora ficam na tabela própria (rotas /social/stories).
LEGADAS = {"stories"}
MAX_BYTES = 2_000_000   # por chave


@router.get("/dados", response_model=DadosOut)
def baixar_dados(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    linhas = sessao.scalars(select(DadoUsuario).where(DadoUsuario.usuario_id == usuario.id)).all()
    return DadosOut(itens={x.chave: x.valor for x in linhas if x.chave in CHAVES})


@router.put("/dados", response_model=DadosOut)
def enviar_dados(dados: DadosIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    dados.itens = {k: v for k, v in dados.itens.items() if k not in LEGADAS}
    desconhecidas = sorted(set(dados.itens) - CHAVES)
    if desconhecidas:
        raise HTTPException(422, f"Chaves não aceitas: {', '.join(desconhecidas)}.")
    for chave, valor in dados.itens.items():
        if len(json.dumps(valor, ensure_ascii=False)) > MAX_BYTES:
            raise HTTPException(413, f"O dado '{chave}' é grande demais.")
    existentes = {
        x.chave: x
        for x in sessao.scalars(
            select(DadoUsuario).where(DadoUsuario.usuario_id == usuario.id, DadoUsuario.chave.in_(list(dados.itens)))
        )
    }
    for chave, valor in dados.itens.items():
        if chave in existentes:
            existentes[chave].valor = valor
        else:
            sessao.add(DadoUsuario(usuario_id=usuario.id, chave=chave, valor=valor))
    sessao.commit()
    return DadosOut(itens={chave: dados.itens[chave] for chave in dados.itens})


@router.patch("/perfil", response_model=UsuarioOut)
def mudar_perfil(dados: PerfilIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    if dados.nome is not None:
        usuario.nome = dados.nome.strip()
    if dados.arroba is not None:
        usuario.arroba = dados.arroba or None
    if dados.bio is not None:
        usuario.bio = dados.bio.strip()
    try:
        sessao.commit()
    except IntegrityError:
        sessao.rollback()
        raise HTTPException(409, "Esse @ já está em uso.")
    return usuario
