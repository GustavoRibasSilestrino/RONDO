"""A loja de pacotinhos do site (/loja): comprar (abrir) um pacote, resgatar um código e ver a coleção de mascotes da conta.

Comprar pede a conta do RONDO (no site, a mesma do app; quem não está na conta entra pela tela do RONDIN do site, /entrar)
e o mascote vai direto para a coleção, como nas lojas de jogos. Por enquanto a loja é uma prévia: aqui não há pagamento e
nada é cobrado (ver vitrine/PRODUCT.md). Quando a venda abrir, esta rota passa a exigir a compra confirmada pelo gateway.
O resgate de código fica pronto para vales-presente e promoções (hoje ninguém gera códigos).

Desde 2026-11-19: o lápis (comprado aqui, dá um nome próprio a um mascote da coleção) e a troca de repetidos entre duas
contas (proposta, aceite, recusa e cancelamento)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import (
    AbrirPacoteIn, CasaMascote, ColecaoOut, EscolherMascoteIn, LapisOut, MascoteOut, NomeMascoteIn, NomeMascoteOut, PessoaDaTroca,
    RecompensaIn, RecompensaOut, RepetidosOut, ResgatarIn, TrocaIn, TrocaOut, TrocasOut,
)
from app.modelos import Troca, Usuario
from app.servicos import loja as servico_loja
from app.servicos.social import ha_bloqueio, notificar

router = APIRouter(prefix="/loja", tags=["loja"])


def _mascote(linha: int, coluna: int, quantidade: int, nome: str | None = None) -> MascoteOut:
    return MascoteOut(linha=linha, coluna=coluna, raridade=servico_loja.RARIDADES[linha][0], quantidade=quantidade, nome=nome)


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
        mascotes=[_mascote(m.linha, m.coluna, m.quantidade, m.nome) for m in servico_loja.colecao(sessao, usuario.id)],
        pode_comprar=servico_loja.pode_comprar(usuario.papel),
        escolhido=usuario.mascote,
        lapis=usuario.lapis,
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


# ---------- o lápis: comprar na loja e dar um nome próprio a um mascote ----------
@router.post("/lapis", response_model=LapisOut, status_code=201)
def comprar_lapis(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Compra um lápis: ele fica guardado na conta e aparece na aba Coleção do app. Segue a mesma regra dos pacotes:
    com a loja fechada, só o dono compra."""
    if not servico_loja.pode_comprar(usuario.papel):
        raise HTTPException(403, servico_loja.MSG_FECHADA)
    return LapisOut(lapis=servico_loja.comprar_lapis(sessao, usuario.id))


@router.put("/nome", response_model=NomeMascoteOut)
def dar_nome(dados: NomeMascoteIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Dá um nome próprio a um mascote da coleção da conta. Cada nome gasta um lápis."""
    try:
        nome, sobram = servico_loja.renomear(sessao, usuario, dados.linha, dados.coluna, dados.nome)
    except servico_loja.NomeInvalido as e:
        raise HTTPException(422, str(e))
    except servico_loja.NaoTemMascote:
        raise HTTPException(404, "Esse mascote não está na sua coleção.")
    except servico_loja.SemLapis:
        raise HTTPException(409, "Você não tem lápis. Compre um na loja do site para dar um nome ao mascote.")
    return NomeMascoteOut(linha=dados.linha, coluna=dados.coluna, nome=nome, lapis=sobram)


# ---------- troca de repetidos ----------
def _pessoa(u: Usuario) -> PessoaDaTroca:
    return PessoaDaTroca(id=u.id, nome=u.nome, arroba=u.arroba, foto=u.foto)


def _troca(t: Troca, eu: int, pessoas: dict[int, Usuario]) -> TrocaOut:
    recebida = t.para_id == eu
    oferecido, pedido = CasaMascote(linha=t.of_linha, coluna=t.of_coluna), CasaMascote(linha=t.pede_linha, coluna=t.pede_coluna)
    return TrocaOut(
        id=t.id, estado=t.estado, recebida=recebida, pessoa=_pessoa(pessoas[t.de_id if recebida else t.para_id]),
        # quem recebeu a proposta entrega o que foi pedido e ganha o que foi oferecido; quem propôs, o contrário
        dou=pedido if recebida else oferecido, recebo=oferecido if recebida else pedido, criada_em=t.criada_em,
    )


def _outra_pessoa(sessao: Session, pessoa_id: int, eu: Usuario) -> Usuario:
    """A outra conta da troca. Quem não existe, foi banido ou tem bloqueio com a conta dá o mesmo "não encontrada"."""
    u = sessao.get(Usuario, pessoa_id)
    if u is None or getattr(u, "banido", False) or ha_bloqueio(sessao, eu.id, pessoa_id):
        raise HTTPException(404, "Pessoa não encontrada.")
    return u


@router.get("/repetidos/{pessoa_id}", response_model=RepetidosOut)
def repetidos_da_pessoa(pessoa_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Os mascotes que outra pessoa tem repetidos: é o que dá para pedir a ela numa troca."""
    u = _outra_pessoa(sessao, pessoa_id, usuario)
    return RepetidosOut(pessoa=_pessoa(u), mascotes=[_mascote(m.linha, m.coluna, m.quantidade) for m in servico_loja.repetidos(sessao, u.id)])


@router.get("/trocas", response_model=TrocasOut)
def trocas(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    lista = servico_loja.trocas_de(sessao, usuario.id)
    ids = {t.de_id for t in lista} | {t.para_id for t in lista}
    pessoas = {u.id: u for u in sessao.query(Usuario).filter(Usuario.id.in_(ids))} if ids else {}
    saida = [_troca(t, usuario.id, pessoas) for t in lista if t.de_id in pessoas and t.para_id in pessoas]
    return TrocasOut(trocas=saida, pendentes_recebidas=sum(1 for t in saida if t.recebida and t.estado == "pendente"))


@router.post("/trocas", response_model=TrocaOut, status_code=201)
def propor_troca(dados: TrocaIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    para = _outra_pessoa(sessao, dados.para_id, usuario)
    try:
        t = servico_loja.propor_troca(sessao, usuario, para, (dados.ofereco.linha, dados.ofereco.coluna), (dados.peco.linha, dados.peco.coluna))
    except servico_loja.TrocaInvalida as e:
        raise HTTPException(409, str(e))
    notificar(sessao, para.id, usuario, "troca")   # o aviso aparece nas notificações do app
    sessao.commit()
    return _troca(t, usuario.id, {usuario.id: usuario, para.id: para})


def _responder(troca_id: int, aceitar: bool, usuario: Usuario, sessao: Session) -> TrocaOut:
    try:
        t = servico_loja.responder_troca(sessao, troca_id, usuario.id, aceitar)
    except servico_loja.TrocaNaoEncontrada:
        raise HTTPException(404, "Essa proposta não existe ou já foi respondida.")
    except servico_loja.TrocaInvalida as e:
        raise HTTPException(409, str(e))
    de = sessao.get(Usuario, t.de_id)
    if aceitar and de is not None:
        notificar(sessao, de.id, usuario, "troca_ok")
        sessao.commit()
    return _troca(t, usuario.id, {usuario.id: usuario, t.de_id: de})


@router.post("/trocas/{troca_id}/aceitar", response_model=TrocaOut)
def aceitar_troca(troca_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    return _responder(troca_id, True, usuario, sessao)


@router.post("/trocas/{troca_id}/recusar", response_model=TrocaOut)
def recusar_troca(troca_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    return _responder(troca_id, False, usuario, sessao)


@router.post("/trocas/{troca_id}/cancelar", response_model=TrocaOut)
def cancelar_troca(troca_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    try:
        t = servico_loja.cancelar_troca(sessao, troca_id, usuario.id)
    except servico_loja.TrocaNaoEncontrada:
        raise HTTPException(404, "Essa proposta não existe ou já foi respondida.")
    return _troca(t, usuario.id, {usuario.id: usuario, t.para_id: sessao.get(Usuario, t.para_id)})
