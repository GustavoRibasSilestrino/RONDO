"""A loja de pacotinhos do site (/loja): comprar (abrir) um pacote, resgatar um código e ver a coleção de mascotes da conta.

Comprar pede a conta do RONDO (no site, a mesma do app; quem não está na conta entra pela tela do RONDIN do site, /entrar)
e o mascote vai direto para a coleção, como nas lojas de jogos. Por enquanto a loja é uma prévia: aqui não há pagamento e
nada é cobrado (ver vitrine/PRODUCT.md). Quando a venda abrir, esta rota passa a exigir a compra confirmada pelo gateway.
O resgate de código fica pronto para vales-presente e promoções (hoje ninguém gera códigos)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import AbrirPacoteIn, ColecaoOut, MascoteOut, ResgatarIn
from app.modelos import Usuario
from app.servicos import loja as servico_loja

router = APIRouter(prefix="/loja", tags=["loja"])


def _mascote(linha: int, coluna: int, quantidade: int) -> MascoteOut:
    return MascoteOut(linha=linha, coluna=coluna, raridade=servico_loja.RARIDADES[linha][0], quantidade=quantidade)


@router.post("/abrir", response_model=MascoteOut, status_code=201)
def abrir(dados: AbrirPacoteIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    if not servico_loja.pode_comprar(usuario.papel):   # loja fechada: só o dono compra, para testar
        raise HTTPException(403, servico_loja.MSG_FECHADA)
    return _mascote(*servico_loja.comprar(sessao, usuario.id, dados.pacote))


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
        pode_comprar=servico_loja.pode_comprar(usuario.papel),
    )
