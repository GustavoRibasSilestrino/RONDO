"""Tudo o que é da própria pessoa logada: os dados do app (treinos, dieta, água...) e o perfil."""
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import ApagarContaIn, DadosIn, DadosOut, MarketingIn, PerfilIn, StatusOut, UsuarioOut
from app.legal import VERSAO_PRIVACIDADE
from app.modelos import Consentimento, DadoUsuario, Usuario
from app.seguranca import conferir_senha
from app.servicos import conta as servico_conta
from app.servicos import midia as servico_midia

router = APIRouter(prefix="/me", tags=["me"])

# o que o app pode guardar. `xpExtra` e `pro` ficam de fora de propósito: quem define é o servidor (papel, selo e PRO)
CHAVES = {
    "perfil", "perfilFit", "treinos", "treinoAtual", "rotinasProprias", "refeicoes", "agua", "checkins", "pesos",
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
    if dados.nome is not None and dados.nome.strip() != usuario.nome:
        if servico_conta.nome_em_uso(sessao, dados.nome, ignorar_id=usuario.id):   # trocar o nome para o de outra conta também não vale
            raise HTTPException(409, servico_conta.MSG_NOME_EM_USO)
        usuario.nome = dados.nome.strip()
    if dados.arroba is not None:
        usuario.arroba = dados.arroba or None
    if dados.bio is not None:
        usuario.bio = dados.bio.strip()
    foto_antiga = usuario.foto
    if "foto" in dados.model_fields_set:
        nova = (dados.foto or "").strip() or None
        # só aceita arquivo da pasta do próprio usuário no Storage (não um endereço qualquer)
        if nova and not nova.startswith(f"{servico_midia.prefixo_publico()}{usuario.id}/"):
            raise HTTPException(422, "Foto inválida.")
        usuario.foto = nova
    try:
        sessao.commit()
    except IntegrityError:
        sessao.rollback()
        raise HTTPException(409, "Esse @ já está em uso.")
    if foto_antiga and foto_antiga != usuario.foto:
        servico_midia.apagar_arquivos([foto_antiga])   # a foto trocada ou removida não fica sobrando no Storage
    return usuario


# ---------- direitos do titular (LGPD, art. 18) ----------

@router.get("/exportar")
def exportar(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Uma cópia de tudo o que o servidor guarda da pessoa, para baixar."""
    return servico_conta.exportar(sessao, usuario)


@router.delete("", response_model=StatusOut)
def apagar_conta(dados: ApagarContaIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Apaga a conta e todos os dados dela no servidor. Pede a senha para confirmar."""
    if not conferir_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(401, "Senha incorreta.")
    servico_conta.apagar_conta(sessao, usuario)
    return StatusOut(status="ok")


@router.patch("/marketing", response_model=UsuarioOut)
def mudar_marketing(dados: MarketingIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Receber ou não e-mails de novidades. Cada mudança fica registrada."""
    usuario.marketing = dados.marketing
    sessao.add(Consentimento(usuario_id=usuario.id, tipo="marketing", versao=VERSAO_PRIVACIDADE, aceito=dados.marketing, origem="app"))
    sessao.commit()
    return usuario
