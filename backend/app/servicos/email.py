"""Envio de e-mail por API HTTP (Brevo ou Resend). Não usa SMTP: o plano grátis do Render bloqueia as portas de SMTP."""
import logging

import httpx

from app.config import config

log = logging.getLogger("rondo.email")


class EmailIndisponivel(Exception):
    pass


def enviar(para: str, assunto: str, texto: str) -> None:
    cfg = config()
    if cfg.email_modo_teste:
        log.warning("E-mail de teste para %s | %s | %s", para, assunto, texto)
        return
    if not cfg.email_remetente or not (cfg.brevo_api_key or cfg.resend_api_key):
        raise EmailIndisponivel("E-mail não configurado.")
    try:
        if cfg.brevo_api_key:
            r = httpx.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": cfg.brevo_api_key, "accept": "application/json", "content-type": "application/json"},
                json={"sender": {"name": cfg.email_remetente_nome, "email": cfg.email_remetente}, "to": [{"email": para}], "subject": assunto, "textContent": texto},
                timeout=10,
            )
        else:
            r = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {cfg.resend_api_key}"},
                json={"from": f"{cfg.email_remetente_nome} <{cfg.email_remetente}>", "to": [para], "subject": assunto, "text": texto},
                timeout=10,
            )
    except httpx.HTTPError as e:
        raise EmailIndisponivel("O serviço de e-mail não respondeu.") from e
    if r.status_code >= 300:
        raise EmailIndisponivel(f"O serviço de e-mail respondeu {r.status_code}.")
