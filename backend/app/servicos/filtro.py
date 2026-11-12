"""O filtro de palavras ofensivas. Recebe um texto e diz se ele tem alguma palavra de servicos/palavras_bloqueadas.py.

Para não ser enganado com facilidade, o texto é arrumado antes de comparar:
- minúsculas e sem acento ("Ç" vira "c", "ã" vira "a");
- números e símbolos que imitam letras viram a letra ("pu7a", "m3rd@", "$hit");
- letras repetidas encolhem ("puuuuta", "merdaaa");
- letras soltas separadas por ponto, espaço ou traço se juntam ("p.u.t.a", "f u c k").
A comparação é por palavra inteira (com e sem o "s" do plural), para "cu" não pegar "curso" nem "escuro"; alguns trechos
inequívocos (DENTRO_DE_PALAVRAS) são procurados também dentro de palavras grudadas.
"""
import re
import unicodedata

from app.servicos.palavras_bloqueadas import DENTRO_DE_PALAVRAS, TODAS

_IMITA = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "|": "i"})


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))


def _encolher(palavra: str) -> str:
    """Letras repetidas viram uma só ("puuuta" -> "puta"). Duas iguais também, para "merdaa" -> "merda"."""
    return re.sub(r"(.)\1+", r"\1", palavra)


def _palavras(texto: str) -> list[str]:
    t = _sem_acento(texto).lower().translate(_IMITA)
    # letras soltas separadas por ponto, traço, sublinhado ou espaço: "p.u.t.a" e "f u c k" viram uma palavra só
    t = re.sub(r"\b(?:[a-z][\s._\-*]+){2,}[a-z]\b", lambda m: re.sub(r"[\s._\-*]+", "", m.group(0)), t)
    return [p for p in re.split(r"[^a-z]+", t) if p]


def _bate(p: str) -> bool:
    if p in TODAS:
        return True
    if p.endswith("s") and p[:-1] in TODAS:
        return True
    if p.endswith("es") and p[:-2] in TODAS:
        return True
    return False


def achar_ofensa(*textos: str | None) -> str | None:
    """A primeira palavra bloqueada encontrada nos textos (como foi encontrada), ou None se estiver tudo certo."""
    for texto in textos:
        if not texto:
            continue
        for p in _palavras(texto):
            for forma in (p, _encolher(p)):
                if _bate(forma):
                    return forma
            for trecho in DENTRO_DE_PALAVRAS:
                if len(p) > len(trecho) and (trecho in p or trecho in _encolher(p)):
                    return trecho
    return None
