"""A loja de browniezinhos do site (desde 2026-11-18): o catálogo de mascotes, o preço de cada raridade, a compra e o resgate.

Desde 2026-11-27 a loja vende CADA MASCOTE separado, por um preço fixo da raridade dele (pedido do dono). Antes vendia
pacotes sorteados, que são caixas de recompensa ("loot boxes"), proibidas pelo ECA Digital (Lei 15.211/2025) em produtos
que crianças e adolescentes provavelmente usam, e o RONDO aceita menores com autorização do responsável. Agora a pessoa
escolhe o mascote, vê o preço e leva exatamente aquele: não há sorteio pago. O sorteio continua só nas recompensas grátis
do app (`recompensar`, por missão e por nível).

Comprar pede a conta do RONDO e o mascote vai direto para a coleção dela. O resgate de código (`resgatar`) fica pronto para
vales-presente e promoções: um código põe um mascote na conta de quem o resgata, uma vez só, em até 7 dias (app/legal.py).
Hoje nenhum código é gerado. Os preços são os mesmos que o site mostra (vitrine/src/data/loja.ts); o teste
`test_precos_iguais_aos_do_site` confere. Se mudar um preço ou a quantidade de mascotes, mude nos dois lugares."""
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
    """o lápis: com a loja fechada, só o dono compra"""
    return ABERTA or papel == "dono"


# A COMPRA DE MASCOTES está bloqueada para TODAS as contas, até a do dono (pedido do dono em 2026-11-27: "bloqueie a
# abertura dos pacotes lá no site"; valia para os pacotes e segue valendo para a venda de cada mascote). Só abre com
# LOJA_ABERTA, junto com o pagamento.
def pode_comprar_mascote() -> bool:
    return ABERTA


# A folha de mascotes tem 13 casas na linha dos comuns e 14 em cada outra. Um mascote tirado (a pedido do dono) sai do
# sorteio e da coleção, mas a casa dele continua na folha, vazia: assim a chave de cada mascote ("linha-coluna") não muda
# e ninguém perde o que já tem.
CASAS = (13, 14, 14, 14, 14)
TIRADOS = {(1, 6), (3, 5), (4, 10),   # o Browdiabinho, o Browinferno e o Browdemônio, tirados em 2026-11-19
           # os que ficaram sem 3D, tirados em 2026-11-25 (pedido do dono, quando os mascotes viraram 3D): o Browpolicial,
           # o Browgelo, o Browcosmonauta, o Browmagma, o Browglacial, o Browdiamante, o Browciber, o Browglitch e o Browsombra
           (0, 1), (2, 3), (3, 2), (3, 12), (4, 8), (4, 9), (4, 11), (4, 12), (4, 13)}
COLUNAS: list[list[int]] = [[c for c in range(n) if (linha, c) not in TIRADOS] for linha, n in enumerate(CASAS)]
# as raridades na ordem das linhas da folha, com quantos mascotes cada uma tem de verdade (57 no total)
RARIDADES: list[tuple[str, int]] = [(nome, len(COLUNAS[i])) for i, nome in enumerate(("comum", "incomum", "rara", "epica", "lendaria"))]
TOTAL = sum(quantos for _, quantos in RARIDADES)

# o preço de cada mascote, pela raridade, em centavos, na ordem de RARIDADES (estimativas do dono; hoje nada é cobrado)
PRECOS: tuple[int, ...] = (299, 399, 599, 999, 1299)   # subiram em 2026-11-28 (antes 199, 299, 499, 799 e 999)

# o código de resgate: 10 letras e números sem os que se confundem (0 e O, 1, I e L), mostrado em dois blocos de 5
ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
TAMANHO = 10


class CodigoInvalido(Exception):
    """O código não existe ou já venceu."""


class CodigoDeOutraConta(Exception):
    """O código já foi resgatado por outra conta."""


class MascoteInexistente(Exception):
    """Não há mascote nessa casa da folha (fora dela, ou um mascote tirado a pedido do dono)."""


def existe(linha: int, coluna: int) -> bool:
    return 0 <= linha < len(COLUNAS) and coluna in COLUNAS[linha]


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
    # o primeiro mascote da conta vira o que ela mostra (ao lado da foto, nos posts, passeando pelo app); o XP dos treinos
    # passa a contar para ele a partir de agora
    sessao.execute(update(Usuario).where(Usuario.id == usuario_id, Usuario.mascote.is_(None)).values(mascote=f"{linha}-{coluna}", xp_treino_ate=_agora_ms()))


def _quantos(sessao: Session, usuario_id: int, linha: int, coluna: int) -> int:
    return sessao.scalar(select(Mascote.quantidade).where(Mascote.usuario_id == usuario_id, Mascote.linha == linha, Mascote.coluna == coluna)) or 0


def comprar_mascote(sessao: Session, usuario_id: int, linha: int, coluna: int) -> tuple[int, int, int]:
    """Compra o mascote escolhido para a conta (se já tinha, soma mais um). Devolve (linha, coluna, quantos tem agora)."""
    if not existe(linha, coluna):
        raise MascoteInexistente
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


# ---------- o XP e o nível dos mascotes (desde 2026-11-23, pedido do dono) ----------
# Cada mascote liberado tem um nível, que sobe com XP (mascotes.xp). SÓ O MASCOTE ESCOLHIDO ganha XP (o que a conta mostra,
# usuarios.mascote; decisão do dono): 30 a cada treino e 60 a cada missão cumprida enquanto ele é o escolhido. Os outros
# guardam o XP que têm. O nível sai do XP, no app (app/src/lib/nivelMascote.ts, com os mesmos números; o teste
# test_xp_igual_ao_do_app confere). É o nível que vai decidir a força do mascote no jogo de batalhas (que ainda não existe).
#
# A missão: quem dá o brownie dela é o servidor (recompensar), que já credita o XP no mascote escolhido naquela hora. A missão
# que dá o primeiro mascote da conta não conta para ele (ainda não havia mascote).
# O treino: os treinos ficam nos dados do app, então o app manda a hora em que cada um terminou (contar_treinos) e o servidor
# conta só os que terminaram depois de usuarios.xp_treino_ate: o fim do último treino contado ou a hora em que o mascote de
# agora foi escolhido, o que for mais novo. Assim nenhum treino conta duas vezes e treino feito antes da escolha não dá XP ao
# mascote novo. Como todo o resto do app, o servidor confia no treino que o app informa; quando o jogo existir, isso precisa
# de uma conferência de verdade.
XP_TREINO, XP_MISSAO = 30, 60
TREINOS_POR_PEDIDO = 20                 # quantos treinos novos um pedido pode contar
FOLGA_DO_RELOGIO_MS = 5 * 60 * 1000     # o relógio do aparelho pode estar um pouco adiantado


def _agora_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def _dar_xp(sessao: Session, usuario_id: int, mascote: str | None, xp: int) -> None:
    """Soma XP ao mascote "linha-coluna" da conta, sem gravar (quem chama faz o commit)."""
    if not mascote or xp <= 0:
        return
    linha, coluna = (int(x) for x in mascote.split("-"))
    sessao.execute(update(Mascote).where(Mascote.usuario_id == usuario_id, Mascote.linha == linha, Mascote.coluna == coluna).values(xp=Mascote.xp + xp))


def xp_de(sessao: Session, usuario_id: int, mascote: str | None) -> int:
    if not mascote:
        return 0
    linha, coluna = (int(x) for x in mascote.split("-"))
    return sessao.scalar(select(Mascote.xp).where(Mascote.usuario_id == usuario_id, Mascote.linha == linha, Mascote.coluna == coluna)) or 0


def contar_treinos(sessao: Session, usuario_id: int, fins: list[int]) -> tuple[str | None, int, int]:
    """Dá ao mascote escolhido o XP dos treinos que ainda não contaram. `fins`: a hora em que cada treino terminou, em
    milissegundos. Devolve (o mascote escolhido, o XP ganho agora, o XP que ele tem). Mandar de novo os mesmos treinos não
    soma outra vez."""
    for _ in range(3):
        mascote, ate = sessao.execute(select(Usuario.mascote, Usuario.xp_treino_ate).where(Usuario.id == usuario_id)).one()
        agora = _agora_ms()
        if ate is None:   # nunca contou e nunca escolheu mascote: começa a contar daqui
            novos, marca = [], agora
        else:
            novos = sorted({f for f in fins if ate < f <= agora + FOLGA_DO_RELOGIO_MS})[:TREINOS_POR_PEDIDO]
            marca = max([ate, *novos])
        if marca == ate:
            return mascote, 0, xp_de(sessao, usuario_id, mascote)
        # avança a marca só se ninguém avançou antes (dois pedidos juntos: um só conta os treinos)
        mesma = Usuario.xp_treino_ate.is_(None) if ate is None else Usuario.xp_treino_ate == ate
        if not sessao.execute(update(Usuario).where(Usuario.id == usuario_id, mesma).values(xp_treino_ate=marca)).rowcount:
            sessao.rollback()
            continue
        ganho = len(novos) * XP_TREINO if mascote else 0   # sem mascote escolhido, os treinos passam sem dar XP
        _dar_xp(sessao, usuario_id, mascote, ganho)
        sessao.commit()
        return mascote, ganho, xp_de(sessao, usuario_id, mascote)
    raise RuntimeError("não foi possível contar os treinos agora")


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
        if chave.startswith("missao:"):   # a missão cumprida dá XP ao mascote que a conta já mostrava (o de nível, não)
            _dar_xp(sessao, usuario_id, sessao.scalar(select(Usuario.mascote).where(Usuario.id == usuario_id)), XP_MISSAO)
        _somar(sessao, usuario_id, linha, coluna, agora)
        try:
            sessao.commit()
        except IntegrityError:   # o mesmo pedido chegou duas vezes juntas: o outro levou; lê de novo
            sessao.rollback()
            continue
        return linha, coluna, _quantos(sessao, usuario_id, linha, coluna), True
    raise RuntimeError("não foi possível dar o brownie agora")


def escolher_mascote(sessao: Session, usuario: Usuario, linha: int | None, coluna: int | None) -> bool:
    """Troca o mascote que a conta mostra por um da coleção dela (ou por nenhum). Falso se ela não tem esse mascote.
    Ao trocar, o XP dos treinos passa a contar para o novo a partir de agora (os treinos feitos antes não valem para ele)."""
    antes = usuario.mascote
    if linha is None or coluna is None:
        usuario.mascote = None
        usuario.mascote_nome = None
    elif (linha, coluna) not in TIRADOS and _quantos(sessao, usuario.id, linha, coluna) > 0:
        usuario.mascote = f"{linha}-{coluna}"
        if usuario.mascote != antes:
            usuario.xp_treino_ate = max(usuario.xp_treino_ate or 0, _agora_ms())
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
# no app (aba Coleção): oferece um repetido seu e pede um repetido de outra pessoa. Só repetidos entram, dos dois lados, então
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
