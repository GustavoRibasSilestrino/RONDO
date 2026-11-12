"""A política de conteúdo do RONDO: avisos, suspensão e banimento.

Regra (pedida pelo dono em 2026-11-12):
- cada tentativa de publicar algo inapropriado (palavra bloqueada pelo filtro, servicos/filtro.py) é barrada e vira um
  AVISO; um conteúdo tirado do ar pela moderação depois de denúncia também conta como aviso;
- a pessoa tem 3 avisos; passou do limite (a 4ª vez), a conta é SUSPENSA por 7 dias e os avisos voltam a zero;
- quem já tem 2 suspensões e passa do limite de novo é BANIDO: a conta não entra mais.
Suspensa, a pessoa continua usando o app (treinos, dieta...), mas não publica nada (posts, comentários, stories, clubes,
nome, @ e bio). Banida, nenhum pedido passa e o login é recusado. Tudo fica no histórico (tabela penalidades).
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modelos import Penalidade, Usuario
from app.servicos.filtro import achar_ofensa

LIMITE_AVISOS = 3
SUSPENSOES_ATE_BANIR = 2
DURACAO_SUSPENSAO = timedelta(days=7)

MSG_BANIDA = "Esta conta foi banida do RONDO por repetir publicações que violam as regras da comunidade."


def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def suspensa(u: Usuario) -> bool:
    return bool(u.suspenso_ate and _aware(u.suspenso_ate) > datetime.now(timezone.utc))


def _data(d: datetime) -> str:
    return _aware(d).astimezone(timezone(timedelta(hours=-3))).strftime("%d/%m às %H:%M")


def exigir_pode_publicar(u: Usuario) -> None:
    """Para as rotas que publicam: conta banida ou suspensa não publica."""
    if u.banido:
        raise HTTPException(403, MSG_BANIDA)
    if suspensa(u):
        raise HTTPException(403, f"Sua conta está suspensa até {_data(u.suspenso_ate)} (horário de Brasília) por publicações que violam as regras da comunidade. Até lá você não pode publicar.")


def aplicar(sessao: Session, u: Usuario, motivo: str, trecho: str | None) -> str:
    """Registra uma violação e devolve o que aconteceu: 'aviso', 'suspensao' ou 'banimento'. Grava na hora."""
    agora = datetime.now(timezone.utc)
    if u.avisos < LIMITE_AVISOS:
        u.avisos += 1
        sessao.add(Penalidade(usuario_id=u.id, tipo="aviso", motivo=motivo, trecho=(trecho or "")[:300] or None))
        resultado = "aviso"
    elif u.suspensoes >= SUSPENSOES_ATE_BANIR:
        u.banido = True
        u.avisos = 0
        sessao.add(Penalidade(usuario_id=u.id, tipo="banimento", motivo=motivo, trecho=(trecho or "")[:300] or None))
        resultado = "banimento"
    else:
        u.suspensoes += 1
        u.avisos = 0
        u.suspenso_ate = agora + DURACAO_SUSPENSAO
        sessao.add(Penalidade(usuario_id=u.id, tipo="suspensao", motivo=motivo, trecho=(trecho or "")[:300] or None))
        resultado = "suspensao"
    sessao.commit()
    return resultado


def mensagem(u: Usuario, resultado: str) -> str:
    if resultado == "banimento":
        return MSG_BANIDA
    if resultado == "suspensao":
        return (f"Sua conta foi suspensa por 7 dias, até {_data(u.suspenso_ate)} (horário de Brasília), por passar do limite de "
                f"{LIMITE_AVISOS} avisos. Esta é a suspensão {u.suspensoes} de {SUSPENSOES_ATE_BANIR}: depois da segunda, "
                "passar do limite de novo bane a conta.")
    restam = LIMITE_AVISOS - u.avisos
    seguinte = "suspensão da conta" if u.suspensoes < SUSPENSOES_ATE_BANIR else "banimento da conta"
    return (f"Isso não foi publicado: tem uma palavra que não é permitida no RONDO. Aviso {u.avisos} de {LIMITE_AVISOS}. "
            + (f"Depois de mais {restam}, a próxima vez é {seguinte}." if restam else f"A próxima vez é {seguinte}."))


def conferir_texto(sessao: Session, u: Usuario, *textos: str | None) -> None:
    """Antes de publicar: barra quem não pode publicar e, se o texto tiver palavra bloqueada, aplica a política e recusa."""
    exigir_pode_publicar(u)
    achada = achar_ofensa(*textos)
    if not achada:
        return
    trecho = " · ".join(t for t in textos if t)
    resultado = aplicar(sessao, u, f"Palavra bloqueada: {achada}", trecho)
    raise HTTPException(403 if resultado != "aviso" else 422, mensagem(u, resultado))


def nome_permitido(*textos: str | None) -> None:
    """No cadastro (a conta ainda não existe, não há aviso): só recusa o nome com palavra bloqueada."""
    if achar_ofensa(*textos):
        raise HTTPException(422, "Esse nome tem uma palavra que não é permitida no RONDO. Escolha outro.")
