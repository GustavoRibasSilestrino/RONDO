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

from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.legal import RETENCAO_RESGATES
from app.modelos import Mascote, Recompensa, Resgate, Troca, Usuario
from app.servicos.filtro import achar_ofensa

# A loja fica FECHADA até a venda abrir de verdade (pedido do dono em 2026-11-18: sem pagamento, quem testasse o site
# ganharia mascotes de graça). Fechada, só a conta do dono compra (para testar a abertura do pacote); as outras veem
# "Em breve" no site e o servidor recusa. Para abrir: LOJA_ABERTA=true no painel do Render (junto com o pagamento).
ABERTA = os.environ.get("LOJA_ABERTA", "").strip().lower() in {"1", "true", "sim"}
MSG_FECHADA = "A loja abre em breve. Por enquanto as compras estão fechadas."


def pode_comprar(papel: str) -> bool:
    return ABERTA or papel == "dono"


# A folha de mascotes tem 13 casas na linha dos comuns e 14 em cada outra. Um mascote tirado (a pedido do dono) sai do
# sorteio e da coleção, mas a casa dele continua na folha, vazia: assim a chave de cada mascote ("linha-coluna") não muda
# e ninguém perde o que já tem.
CASAS = (13, 14, 14, 14, 14)
TIRADOS = {(1, 6), (3, 5), (4, 10)}   # o Browdiabinho, o Browinferno e o Browdemônio, tirados em 2026-11-19
COLUNAS: list[list[int]] = [[c for c in range(n) if (linha, c) not in TIRADOS] for linha, n in enumerate(CASAS)]
# as raridades na ordem das linhas da folha, com quantos mascotes cada uma tem de verdade (66 no total)
RARIDADES: list[tuple[str, int]] = [(nome, len(COLUNAS[i])) for i, nome in enumerate(("comum", "incomum", "rara", "epica", "lendaria"))]
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
            return linha, secrets.choice(COLUNAS[linha])
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
    # o primeiro mascote da conta vira o que ela mostra (ao lado da foto, nos posts, passeando pelo app)
    sessao.execute(update(Usuario).where(Usuario.id == usuario_id, Usuario.mascote.is_(None)).values(mascote=f"{linha}-{coluna}"))


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
    """A coleção da conta, sem os mascotes tirados (quem já tinha um deles continua com a linha no banco, só não aparece)."""
    todos = sessao.scalars(select(Mascote).where(Mascote.usuario_id == usuario_id).order_by(Mascote.linha, Mascote.coluna))
    return [m for m in todos if (m.linha, m.coluna) not in TIRADOS]


# ---------- os brownies de recompensa do app (desde 2026-11-19, no lugar das medalhas) ----------
# Cada missão cumprida e cada nível de conta alcançado dão um brownie (um mascote sorteado para a coleção). A raridade sobe
# com o caminho: quanto mais brownies a conta já ganhou, mais o sorteio pende para as raridades altas. No começo quase só sai
# comum; lá pelo 25º brownie, o centro do sorteio já é a lendária. Nenhuma raridade fica impossível (cada uma tem pelo menos
# 0,5%), e cada chave dá um brownie só.
LIMITE_RECOMPENSAS = 300   # de folga: as missões e os níveis do app somam bem menos que isto


def chances_recompensa(ganhos: int) -> tuple[int, ...]:
    """A chance de cada raridade (em milésimos, somando 1000) para o próximo brownie de quem já ganhou `ganhos`."""
    alvo = min(4.0, ganhos / 6)
    pesos = [max(5.0, 1000 * 2.718281828 ** (-((i - alvo) ** 2) / 0.9)) for i in range(len(RARIDADES))]
    total = sum(pesos)
    milesimos = [round(1000 * p / total) for p in pesos]
    milesimos[milesimos.index(max(milesimos))] += 1000 - sum(milesimos)   # o arredondamento sai da maior
    return tuple(milesimos)


def _sortear_com(chances: tuple[int, ...]) -> tuple[int, int]:
    sorte = secrets.randbelow(1000)
    for linha, peso in enumerate(chances):
        if sorte < peso:
            return linha, secrets.choice(COLUNAS[linha])
        sorte -= peso
    return len(chances) - 1, secrets.choice(COLUNAS[-1])


class LimiteDeRecompensas(Exception):
    """A conta já ganhou brownies demais (o app nunca chega lá; é só uma trava)."""


def recompensar(sessao: Session, usuario_id: int, chave: str) -> tuple[int, int, int, bool]:
    """Dá o brownie da missão ou do nível `chave`. Devolve (linha, coluna, quantos a conta tem dele, se é novo).
    Pedir de novo a mesma chave devolve o brownie que ela já deu, sem somar."""
    for _ in range(3):
        ja = sessao.get(Recompensa, (usuario_id, chave))
        if ja is not None:
            return ja.linha, ja.coluna, _quantos(sessao, usuario_id, ja.linha, ja.coluna), False
        ganhos = sessao.scalar(select(func.count()).select_from(Recompensa).where(Recompensa.usuario_id == usuario_id)) or 0
        if ganhos >= LIMITE_RECOMPENSAS:
            raise LimiteDeRecompensas
        linha, coluna = _sortear_com(chances_recompensa(ganhos))
        agora = datetime.now(timezone.utc)
        sessao.add(Recompensa(usuario_id=usuario_id, chave=chave, linha=linha, coluna=coluna, em=agora))
        _somar(sessao, usuario_id, linha, coluna, agora)
        try:
            sessao.commit()
        except IntegrityError:   # o mesmo pedido chegou duas vezes juntas: o outro levou; lê de novo
            sessao.rollback()
            continue
        return linha, coluna, _quantos(sessao, usuario_id, linha, coluna), True
    raise RuntimeError("não foi possível dar o brownie agora")


def escolher_mascote(sessao: Session, usuario: Usuario, linha: int | None, coluna: int | None) -> bool:
    """Troca o mascote que a conta mostra por um da coleção dela (ou por nenhum). Falso se ela não tem esse mascote."""
    if linha is None or coluna is None:
        usuario.mascote = None
        usuario.mascote_nome = None
    elif (linha, coluna) not in TIRADOS and _quantos(sessao, usuario.id, linha, coluna) > 0:
        usuario.mascote = f"{linha}-{coluna}"
        # o nome que a conta deu a ele (se deu) vai junto, para aparecer no perfil e nas publicações
        usuario.mascote_nome = sessao.scalar(select(Mascote.nome).where(Mascote.usuario_id == usuario.id, Mascote.linha == linha, Mascote.coluna == coluna))
    else:
        return False
    sessao.commit()
    return True


# ---------- o lápis: dar um nome próprio a um mascote da coleção (desde 2026-11-19, pedido do dono) ----------
# O lápis é vendido na loja do site (R$ 10,00 no site; hoje é prévia e nada é cobrado, como os pacotes) e fica guardado na
# conta. No app, na aba Coleção, a pessoa toca no lápis, escolhe um mascote dela e digita o nome: cada nome gasta um lápis.
# O nome é só daquela conta (duas contas podem dar o mesmo nome) e passa pelo filtro de palavras do app.
NOME_MIN, NOME_MAX = 2, 20
_NOME_OK = re.compile(r"^[0-9A-Za-zÀ-ÖØ-öø-ÿ][0-9A-Za-zÀ-ÖØ-öø-ÿ '.\-]*$")


class SemLapis(Exception):
    """A conta não tem lápis guardado."""


class NaoTemMascote(Exception):
    """O mascote não está na coleção da conta."""


class NomeInvalido(Exception):
    """O nome não serve (tamanho, letras ou palavra bloqueada). A mensagem diz por quê."""


def limpar_nome(nome: str) -> str:
    """O nome como vai ser guardado: sem espaços nas pontas nem dobrados. Levanta NomeInvalido se não servir."""
    limpo = re.sub(r"\s+", " ", nome).strip()
    if not NOME_MIN <= len(limpo) <= NOME_MAX:
        raise NomeInvalido(f"O nome precisa ter de {NOME_MIN} a {NOME_MAX} letras.")
    if not _NOME_OK.match(limpo):
        raise NomeInvalido("Use só letras, números, espaço, ponto, hífen e apóstrofo, começando por letra ou número.")
    if achar_ofensa(limpo):
        raise NomeInvalido("Esse nome não pode ser usado. Escolha outro.")
    return limpo


def comprar_lapis(sessao: Session, usuario_id: int) -> int:
    """Guarda mais um lápis na conta. Devolve quantos ela tem agora."""
    sessao.execute(update(Usuario).where(Usuario.id == usuario_id).values(lapis=Usuario.lapis + 1))
    sessao.commit()
    return sessao.scalar(select(Usuario.lapis).where(Usuario.id == usuario_id)) or 0


def renomear(sessao: Session, usuario: Usuario, linha: int, coluna: int, nome: str) -> tuple[str, int]:
    """Dá o nome `nome` ao mascote (linha, coluna) da coleção da conta, gastando um lápis. Devolve (nome, lápis que sobram)."""
    limpo = limpar_nome(nome)
    if (linha, coluna) in TIRADOS or _quantos(sessao, usuario.id, linha, coluna) <= 0:
        raise NaoTemMascote
    # gasta o lápis só se ainda há um (dois pedidos juntos: um só leva)
    if not sessao.execute(update(Usuario).where(Usuario.id == usuario.id, Usuario.lapis > 0).values(lapis=Usuario.lapis - 1)).rowcount:
        sessao.rollback()
        raise SemLapis
    sessao.execute(update(Mascote).where(Mascote.usuario_id == usuario.id, Mascote.linha == linha, Mascote.coluna == coluna).values(nome=limpo))
    if usuario.mascote == f"{linha}-{coluna}":   # é o mascote que a conta mostra: o nome novo aparece para os outros também
        sessao.execute(update(Usuario).where(Usuario.id == usuario.id).values(mascote_nome=limpo))
    sessao.commit()
    return limpo, sessao.scalar(select(Usuario.lapis).where(Usuario.id == usuario.id)) or 0


# ---------- troca de repetidos entre duas contas (desde 2026-11-19, pedido do dono) ----------
# Os pacotes podem trazer um mascote que a conta já tem. Com um repetido (dois ou mais do mesmo), a pessoa propõe uma troca
# na loja do site: oferece um repetido seu e pede um repetido de outra pessoa. Só repetidos entram, dos dois lados, então
# ninguém fica sem um mascote que tinha. Quem recebeu a proposta aceita ou recusa; quem propôs pode cancelar.
LIMITE_PROPOSTAS = 20   # propostas pendentes que uma conta pode ter enviadas ao mesmo tempo


class TrocaInvalida(Exception):
    """A proposta não pode ser feita ou aceita. A mensagem diz por quê."""


class TrocaNaoEncontrada(Exception):
    """A proposta não existe, não é desta conta ou já foi respondida."""


def repetidos(sessao: Session, usuario_id: int) -> list[Mascote]:
    """Os mascotes que a conta tem repetidos (dois ou mais), os únicos que entram em troca."""
    return [m for m in colecao(sessao, usuario_id) if m.quantidade >= 2]


def propor_troca(sessao: Session, de: Usuario, para: Usuario, ofereco: tuple[int, int], peco: tuple[int, int]) -> Troca:
    if de.id == para.id:
        raise TrocaInvalida("Escolha outra pessoa para trocar.")
    if ofereco == peco:
        raise TrocaInvalida("Escolha um mascote diferente do que você oferece.")
    if ofereco in TIRADOS or peco in TIRADOS:
        raise TrocaInvalida("Esse mascote não existe mais.")
    if _quantos(sessao, de.id, *ofereco) < 2:
        raise TrocaInvalida("Você só pode oferecer um mascote que tem repetido.")
    if _quantos(sessao, para.id, *peco) < 2:
        raise TrocaInvalida("Essa pessoa não tem esse mascote repetido.")
    pendentes = sessao.scalar(select(func.count()).select_from(Troca).where(Troca.de_id == de.id, Troca.estado == "pendente")) or 0
    if pendentes >= LIMITE_PROPOSTAS:
        raise TrocaInvalida("Você já tem muitas propostas esperando resposta. Cancele alguma ou aguarde.")
    igual = sessao.scalar(select(Troca.id).where(
        Troca.de_id == de.id, Troca.para_id == para.id, Troca.estado == "pendente",
        Troca.of_linha == ofereco[0], Troca.of_coluna == ofereco[1], Troca.pede_linha == peco[0], Troca.pede_coluna == peco[1],
    ))
    if igual is not None:
        raise TrocaInvalida("Você já fez essa proposta para essa pessoa.")
    t = Troca(de_id=de.id, para_id=para.id, of_linha=ofereco[0], of_coluna=ofereco[1], pede_linha=peco[0], pede_coluna=peco[1])
    sessao.add(t)
    sessao.commit()
    sessao.refresh(t)
    return t


def trocas_de(sessao: Session, usuario_id: int, limite: int = 40) -> list[Troca]:
    """As propostas da conta: primeiro as que esperam resposta (recebidas e enviadas), depois as últimas já resolvidas."""
    minhas = or_(Troca.de_id == usuario_id, Troca.para_id == usuario_id)
    pendentes = list(sessao.scalars(select(Troca).where(minhas, Troca.estado == "pendente").order_by(Troca.id.desc()).limit(limite)))
    resolvidas = list(sessao.scalars(select(Troca).where(minhas, Troca.estado != "pendente").order_by(Troca.id.desc()).limit(10)))
    return pendentes + resolvidas


def _tirar_um(sessao: Session, usuario_id: int, linha: int, coluna: int) -> bool:
    """Tira um do repetido da conta, só se ela ainda tem dois ou mais (nunca tira o último)."""
    return bool(sessao.execute(
        update(Mascote).where(Mascote.usuario_id == usuario_id, Mascote.linha == linha, Mascote.coluna == coluna, Mascote.quantidade >= 2)
        .values(quantidade=Mascote.quantidade - 1)
    ).rowcount)


def responder_troca(sessao: Session, troca_id: int, usuario_id: int, aceitar: bool) -> Troca:
    """Quem recebeu a proposta aceita ou recusa. Ao aceitar, os dois mascotes mudam de conta de uma vez só; se um dos dois
    já não tem o repetido, nada muda, a proposta é cancelada e levanta TrocaInvalida."""
    agora = datetime.now(timezone.utc)
    # marca a resposta só se a proposta ainda espera (dois cliques juntos: um só leva)
    marcou = sessao.execute(
        update(Troca).where(Troca.id == troca_id, Troca.para_id == usuario_id, Troca.estado == "pendente")
        .values(estado="aceita" if aceitar else "recusada", respondida_em=agora)
    ).rowcount
    if not marcou:
        sessao.rollback()
        raise TrocaNaoEncontrada
    t = sessao.get(Troca, troca_id)
    if aceitar:
        ok = _tirar_um(sessao, t.de_id, t.of_linha, t.of_coluna) and _tirar_um(sessao, t.para_id, t.pede_linha, t.pede_coluna)
        if not ok:   # alguém já não tem o repetido: desfaz tudo e encerra a proposta
            sessao.rollback()
            sessao.execute(update(Troca).where(Troca.id == troca_id, Troca.estado == "pendente").values(estado="cancelada", respondida_em=agora))
            sessao.commit()
            raise TrocaInvalida("Um dos dois não tem mais esse mascote repetido. A proposta foi cancelada.")
        _somar(sessao, t.para_id, t.of_linha, t.of_coluna, agora)
        _somar(sessao, t.de_id, t.pede_linha, t.pede_coluna, agora)
    sessao.commit()
    sessao.refresh(t)
    return t


def cancelar_troca(sessao: Session, troca_id: int, usuario_id: int) -> Troca:
    """Quem propôs desiste da proposta que ainda espera resposta."""
    marcou = sessao.execute(
        update(Troca).where(Troca.id == troca_id, Troca.de_id == usuario_id, Troca.estado == "pendente")
        .values(estado="cancelada", respondida_em=datetime.now(timezone.utc))
    ).rowcount
    if not marcou:
        sessao.rollback()
        raise TrocaNaoEncontrada
    sessao.commit()
    return sessao.get(Troca, troca_id)
