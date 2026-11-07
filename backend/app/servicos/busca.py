"""Busca de pessoas parecida com a do Instagram: sem acento e sem maiúscula, por pedaço do nome, pelo @, e perdoando pequenos erros de
digitação. Quem a pessoa já segue vem na frente."""
import unicodedata
from difflib import SequenceMatcher


def normalizar(texto: str) -> str:
    """minúsculas, sem acento e com espaços simples: "Vinícius  Silva" -> "vinicius silva"."""
    sem_acento = "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))
    return " ".join(sem_acento.lower().split())


def texto_de_busca(nome: str, arroba: str | None) -> str:
    """o que fica guardado em usuarios.busca: o nome e o @, já normalizados"""
    return normalizar(f"{nome} {arroba or ''}")[:200]


def _palavras(s: str) -> list[str]:
    return s.replace(".", " ").replace("_", " ").split()


def pontuar(consulta: str, nome: str, arroba: str | None, sigo: bool, me_segue: bool, verificado: bool, seguidores: int) -> float:
    """Quanto mais alto, mais parecido. 0 = não parece com a busca."""
    q = normalizar(consulta).lstrip("@")
    n = normalizar(nome)
    a = (arroba or "").lower()
    palavras_q = q.split()
    palavras_n = _palavras(n) + _palavras(a)
    if not q:
        return 0.0
    if a == q.replace(" ", ""):
        base = 100.0
    elif n == q:
        base = 95.0
    elif n.startswith(q):
        base = 85.0
    elif a.startswith(q.replace(" ", "")):
        base = 80.0
    elif all(any(p.startswith(t) for p in palavras_n) for t in palavras_q):
        base = 72.0            # cada palavra da busca começa uma palavra do nome ("vini sil" acha "Vinícius Silva")
    elif q in n or q.replace(" ", "") in a:
        base = 55.0
    elif any(len(p) >= 3 and any(t.startswith(p) for t in palavras_q) for p in palavras_n):
        base = 40.0            # o nome é um começo do que foi digitado: "vinicius" também acha "Vini Costa"
    else:
        # perdoa erro de digitação: "vinicus" acha "vinicius"
        melhor = max((SequenceMatcher(None, t, p).ratio() for t in palavras_q for p in palavras_n), default=0.0)
        if melhor < 0.72:
            return 0.0
        base = 20.0 + melhor * 30.0
    bonus = (18.0 if sigo else 0.0) + (4.0 if me_segue else 0.0) + (3.0 if verificado else 0.0) + min(5.0, seguidores ** 0.5 / 4)
    return base + bonus
