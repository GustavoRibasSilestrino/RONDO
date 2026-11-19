"""A loja de pacotinhos do site (/loja): abrir um pacote, resgatar o mascote para a conta e ver a coleção.

Abrir não pede conta: o pacote devolve um código de resgate (vale 7 dias). Resgatar pede a conta do RONDO (no site, a
mesma do app). Por enquanto a loja é uma prévia: aqui não há pagamento e nada é cobrado (ver vitrine/PRODUCT.md). Quando a
venda abrir, abrir o pacote passa a exigir a compra confirmada pelo gateway antes de sortear."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import AbrirPacoteIn, ColecaoOut, MascoteOut, PacoteAbertoOut, ResgatarIn
from app.modelos import Usuario
from app.servicos import conta as servico_conta
from app.servicos import loja as servico_loja

router = APIRouter(prefix="/loja", tags=["loja"])


def _mascote(linha: int, coluna: int, quantidade: int) -> MascoteOut:
    return MascoteOut(linha=linha, coluna=coluna, raridade=servico_loja.RARIDADES[linha][0], quantidade=quantidade)


@router.post("/abrir", response_model=PacoteAbertoOut, status_code=201)
def abrir(dados: AbrirPacoteIn, sessao: Session = Depends(obter_sessao)):
    servico_conta.limpar_vencidos(sessao)   # retenção: códigos com mais de 7 dias saem do banco
    codigo, linha, coluna, expira_em = servico_loja.abrir(sessao, dados.pacote)
    return PacoteAbertoOut(
        linha=linha, coluna=coluna, raridade=servico_loja.RARIDADES[linha][0], codigo=servico_loja.formatar(codigo), expira_em=expira_em,
    )


@router.post("/resgatar", response_model=MascoteOut)
def resgatar(dados: ResgatarIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    try:
        linha, coluna, quantidade = servico_loja.resgatar(sessao, usuario.id, servico_loja.normalizar(dados.codigo))
    except servico_loja.CodigoInvalido:
        raise HTTPException(404, "Esse código não existe ou já venceu (ele vale 7 dias).")
    except servico_loja.CodigoDeOutraConta:
        raise HTTPException(409, "Esse código já foi resgatado por outra conta.")
    return _mascote(linha, coluna, quantidade)


@router.get("/colecao", response_model=ColecaoOut)
def colecao(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    return ColecaoOut(
        total=servico_loja.TOTAL,
        mascotes=[_mascote(m.linha, m.coluna, m.quantidade) for m in servico_loja.colecao(sessao, usuario.id)],
    )
