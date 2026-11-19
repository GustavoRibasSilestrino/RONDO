"""A loja de pacotinhos do site (desde 2026-11-18): o catálogo de mascotes, as chances de cada pacote, a compra e o resgate.

Como funciona: comprar um pacote pede a conta do RONDO. O servidor sorteia o mascote e ele vai direto para a coleção da
conta (como nas lojas de jogos). Quem não está na conta entra ou cria a conta na tela do RONDIN do site e volta para a
compra. O resgate de código (`resgatar`) fica pronto para vales-presente e promoções: um código põe um mascote na conta
de quem o resgata, uma vez só, em até 7 dias (app/legal.py). Hoje nenhum código é gerado.

O sorteio é feito aqui, no servidor, e não no navegador: quem abre o pacote não tem como escolher o que sai.
Os números são os mesmos que o site mostra (vitrine/src/data/loja.ts); o teste `test_chances_iguais_as_do_site` confere.
Se mudar as chances ou a quantidade de mascotes, mude nos dois lugares."""
import os
import re
import secrets
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.legal import RETENCAO_RESGATES
from app.modelos import Mascote, Resgate

# A loja fica FECHADA até a venda abrir de verdade (pedido do dono em 2026-11-18: sem pagamento, quem testasse o site
# ganharia mascotes de graça). Fechada, só a conta do dono compra (para testar a abertura do pacote); as outras veem
# "Em breve" no site e o servidor recusa. Para abrir: LOJA_ABERTA=true no painel do Render (junto com o pagamento).
ABERTA = os.environ.get("LOJA_ABERTA", "").strip().lower() in {"1", "true", "sim"}
MSG_FECHADA = "A loja abre em breve. Por enquanto as compras estão fechadas."


def pode_comprar(papel: str) -> bool:
    return ABERTA or papel == "dono"


# as raridades na ordem das linhas da folha de mascotes, com quantos mascotes cada uma tem (69 no total)
RARIDADES: list[tuple[str, int]] = [("comum", 13), ("incomum", 14), ("rara", 14), ("epica", 14), ("lendaria", 14)]
TOTAL = sum(quantos for _, quantos in RARIDADES)

# a chance de cada raridade em cada pacote, em milésimos (cada pacote soma 1000), na ordem de RARIDADES
CHANCES: dict[str, tuple[int, ...]] = {
    "roxo": (700, 220, 65, 14, 1),
    "prata": (450, 320, 160, 60, 10),
    "ouro": (150, 300, 330, 170, 50),
}

# o código de resgate: 10 letras e números sem os que se confundem (0 e O, 1, I e L), mostrado em dois blocos de 5
ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
TAMANHO = 10


class CodigoInvalido(Exception):
    """O código não existe ou já venceu."""


class CodigoDeOutraConta(Exception):
    """O código já foi resgatado por outra conta."""


def sortear(pacote: str) -> tuple[int, int]:
    """Sorteia a raridade pela chance do pacote e, dentro dela, um mascote qualquer (todos com a mesma chance).
    Devolve a posição na folha: (linha, coluna)."""
    sorte = secrets.randbelow(1000)
    for linha, peso in enumerate(CHANCES[pacote]):
        if sorte < peso:
            return linha, secrets.randbelow(RARIDADES[linha][1])
        sorte -= peso
    raise AssertionError(f"as chances do pacote {pacote} não somam 1000")


def novo_codigo() -> str:
    return "".join(secrets.choice(ALFABETO) for _ in range(TAMANHO))


def normalizar(codigo: str) -> str:
    """O código como foi digitado (com hífen, espaço, minúsculas) vira o guardado no banco."""
    return re.sub(r"[^0-9A-Z]", "", codigo.upper())


def _somar(sessao: Session, usuario_id: int, linha: int, coluna: int, agora: datetime) -> None:
    """Põe o mascote na coleção (se já tinha, soma mais um), sem gravar: quem chama faz o commit."""
    onde = (Mascote.usuario_id == usuario_id, Mascote.linha == linha, Mascote.coluna == coluna)
    if not sessao.execute(update(Mascote).where(*onde).values(quantidade=Mascote.quantidade + 1, ultimo_em=agora)).rowcount:
        sessao.add(Mascote(usuario_id=usuario_id, linha=linha, coluna=coluna, quantidade=1, primeiro_em=agora, ultimo_em=agora))


def _quantos(sessao: Session, usuario_id: int, linha: int, coluna: int) -> int:
    return sessao.scalar(select(Mascote.quantidade).where(Mascote.usuario_id == usuario_id, Mascote.linha == linha, Mascote.coluna == coluna)) or 0


def comprar(sessao: Session, usuario_id: int, pacote: str) -> tuple[int, int, int]:
    """Abre um pacote para a conta: sorteia e guarda o mascote. Devolve (linha, coluna, quantos a conta tem dele agora)."""
    linha, coluna = sortear(pacote)
    for _ in range(3):   # duas compras juntas da mesma conta podem criar a mesma linha: a que perder a corrida soma
        _somar(sessao, usuario_id, linha, coluna, datetime.now(timezone.utc))
        try:
            sessao.commit()
        except IntegrityError:
            sessao.rollback()
            continue
        return linha, coluna, _quantos(sessao, usuario_id, linha, coluna)
    raise RuntimeError("não foi possível guardar o mascote")


def resgatar(sessao: Session, usuario_id: int, codigo: str) -> tuple[int, int, int]:
    """Põe o mascote do código na coleção da conta (se já tinha, soma mais um). Devolve (linha, coluna, quantos tem agora).
    Resgatar de novo o mesmo código na mesma conta não soma outra vez."""
    agora = datetime.now(timezone.utc)
    for _ in range(3):
        r = sessao.scalar(select(Resgate).where(Resgate.codigo == codigo, Resgate.criado_em >= agora - RETENCAO_RESGATES))
        if r is None:
            raise CodigoInvalido
        linha, coluna, dono = r.linha, r.coluna, r.usuario_id
        if dono is not None:
            if dono != usuario_id:
                raise CodigoDeOutraConta
            return linha, coluna, _quantos(sessao, usuario_id, linha, coluna)
        # marca o código como desta conta só se ninguém marcou antes (dois resgates juntos: um só leva)
        ganhou = sessao.execute(
            update(Resgate).where(Resgate.codigo == codigo, Resgate.usuario_id.is_(None)).values(usuario_id=usuario_id, resgatado_em=agora)
        ).rowcount
        if not ganhou:
            sessao.rollback()
            continue   # outro pedido levou antes: lê de novo para dizer de quem ficou
        _somar(sessao, usuario_id, linha, coluna, agora)
        try:
            sessao.commit()
        except IntegrityError:   # o mesmo mascote entrou na coleção por outra compra agora mesmo: refaz e soma
            sessao.rollback()
            continue
        return linha, coluna, _quantos(sessao, usuario_id, linha, coluna)
    raise RuntimeError("não foi possível resgatar agora")


def colecao(sessao: Session, usuario_id: int) -> list[Mascote]:
    return list(sessao.scalars(select(Mascote).where(Mascote.usuario_id == usuario_id).order_by(Mascote.linha, Mascote.coluna)))
