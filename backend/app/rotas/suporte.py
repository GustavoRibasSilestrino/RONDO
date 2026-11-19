"""O suporte do site (desde 2026-11-19, pedido do dono): a pessoa escreve o que quer (um problema, uma reclamação, uma
sugestão...) numa janela da seção "Precisa de ajuda?" e a mensagem é encaminhada para a equipe RONDO.

Quem está na conta manda com o e-mail da conta; quem não está informa um e-mail para a resposta. A mensagem fica guardada
(tabela mensagens_suporte, por até 1 ano) e vai por e-mail para a equipe: o EMAIL_SUPORTE (o contato do RONDO) e as contas
de dono. Sem o e-mail configurado (Brevo ou Resend), a mensagem fica só guardada no banco, e o servidor avisa no log."""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.config import config
from app.deps import usuario_opcional
from app.esquemas import ROTULOS_SUPORTE, StatusOut, SuporteIn
from app.modelos import MensagemSuporte, Usuario
from app.servicos import email as servico_email

router = APIRouter(prefix="/suporte", tags=["suporte"])
log = logging.getLogger("rondo.suporte")


def _encaminhar(para: list[str], assunto: str, texto: str) -> None:
    for destino in para:
        try:
            servico_email.enviar(destino, assunto, texto)
        except servico_email.EmailIndisponivel:
            log.warning("Mensagem de suporte guardada, mas o e-mail não está configurado para encaminhar à equipe.")
            return


@router.post("", response_model=StatusOut, status_code=201)
def escrever(dados: SuporteIn, tarefas: BackgroundTasks, usuario: Usuario | None = Depends(usuario_opcional), sessao: Session = Depends(obter_sessao)):
    if usuario:
        email, nome, conta = usuario.email, usuario.nome, (f"@{usuario.arroba}" if usuario.arroba else usuario.nome)
    else:
        if not dados.email:
            raise HTTPException(422, "Informe o seu e-mail para a gente responder.")
        email, nome, conta = dados.email.lower(), (dados.nome or "").strip() or None, None
    texto = dados.mensagem.strip()
    sessao.add(MensagemSuporte(assunto=dados.assunto, mensagem=texto, email=email, nome=nome, usuario_id=usuario.id if usuario else None))
    sessao.commit()

    rotulo = ROTULOS_SUPORTE[dados.assunto]
    para = list(dict.fromkeys([config().email_suporte, *sessao.scalars(select(Usuario.email).where(Usuario.papel == "dono"))]))
    corpo = (
        f"Nova mensagem no suporte do site.\n\nAssunto: {rotulo}\nDe: {nome or 'sem nome'} <{email}>"
        f"{f' (conta {conta})' if conta else ' (sem conta no site)'}\n\n{texto}\n\nPara responder, escreva para {email}."
    )
    tarefas.add_task(_encaminhar, [p for p in para if p], f"Suporte RONDO: {rotulo}", corpo)
    return StatusOut(status="ok")
