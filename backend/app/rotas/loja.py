"""A loja de pacotinhos do site (/loja): comprar (abrir) um pacote, resgatar um código e ver a coleção de mascotes da conta.

Comprar pede a conta do RONDO (no site, a mesma do app; quem não está na conta entra pela tela do RONDIN do site, /entrar)
e o mascote vai direto para a coleção, como nas lojas de jogos. Por enquanto a loja é uma prévia: aqui não há pagamento e
nada é cobrado (ver vitrine/PRODUCT.md). Quando a venda abrir, esta rota passa a exigir a compra confirmada pelo gateway.
O resgate de código fica pronto para vales-presente e promoções (hoje ninguém gera códigos)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import AbrirPacoteIn, ColecaoOut, EscolherMascoteIn, MascoteOut, RecompensaIn, RecompensaOut, ResgatarIn
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
        escolhido=usuario.mascote,
    )


@router.post("/recompensa", response_model=RecompensaOut)
def recompensa(dados: RecompensaIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """O brownie de uma missão cumprida ou de um nível alcançado no app (no lugar das medalhas). Cada chave dá um só."""
    try:
        linha, coluna, quantidade, nova = servico_loja.recompensar(sessao, usuario.id, dados.chave)
    except servico_loja.LimiteDeRecompensas:
        raise HTTPException(429, "Essa conta já ganhou todos os brownies de recompensa.")
    return RecompensaOut(chave=dados.chave, nova=nova, mascote=_mascote(linha, coluna, quantidade))


@router.put("/mascote", status_code=204)
def escolher_mascote(dados: EscolherMascoteIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Troca o mascote que a conta mostra (ao lado da foto, nos posts e passeando pelo app) por outro da coleção dela."""
    if not servico_loja.escolher_mascote(sessao, usuario, dados.linha, dados.coluna):
        raise HTTPException(404, "Esse mascote não está na sua coleção.")
