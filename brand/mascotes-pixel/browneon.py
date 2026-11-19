"""Browneon (lendário, linha 4, coluna 6): o neon. O browniezinho de chocolate amargo, quase preto, com os olhos acesos
em magenta, o fone de ouvido com as conchas de anel neon, a roupa escura com a gola em V de neon laranja e os punhos e
os pés de neon ciano; em volta de tudo, o contorno de luz neon que vai do ciano ao magenta e ao laranja, com a luz se
espalhando por fora.  python browneon.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

AMARGO = [(14, 8, 18), (28, 16, 34), (44, 26, 52), (62, 38, 72), (84, 52, 96), (112, 72, 124)]
CALDA_ESCURA = [(8, 4, 12), (18, 10, 26), (30, 18, 42), (44, 28, 60), (64, 42, 84), (120, 90, 150)]
ROUPA = [(10, 8, 22), (20, 16, 40), (32, 26, 60), (46, 38, 82), (64, 54, 108), (90, 78, 140)]
CIANO = [(10, 90, 140), (30, 180, 230), (120, 235, 255), (220, 252, 255)]
MAGENTA = [(120, 10, 110), (220, 40, 200), (255, 120, 240), (255, 210, 250)]
LARANJA = [(150, 50, 10), (250, 130, 30), (255, 196, 90), (255, 236, 180)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def fone():
    """as conchas do fone dos lados da cabeça, com o anel neon"""
    for cx in (8.5, 55.5):
        b.peca("fone", b.bola(cx, 26.0, 4.6, 6.0), ROUPA, 2.0, cortes=CORTES, linha=ROUPA[0])
        anel = np.abs(b.bola(cx, 26.0, 3.2, 4.4)) < 0.6
        b.pintar(anel, CIANO[2])
        b.pintar(anel & (b.py < 24), CIANO[3])
        b.pintar(anel & (b.py > 28), CIANO[1])


def roupa():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, ROUPA, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ROUPA, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, CIANO + CIANO[-2:])
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ROUPA, 2.5)
        for x in range(x0 + 1, x0 + 7):
            b.ponto(x, 65, CIANO[2]); b.ponto(x, 66, CIANO[1])
    # a gola em V de neon laranja, com o miolo claro
    for y in range(43, 51):
        meia = 7 - (y - 43)
        for x in (31 - meia, 32 + meia):
            b.ponto(x, y, LARANJA[2])
        if meia > 0:
            b.ponto(31 - meia + 1, y, LARANJA[1]); b.ponto(32 + meia - 1, y, LARANJA[1])
    b.ponto(31, 51, LARANJA[3]); b.ponto(32, 51, LARANJA[3])


def contorno_neon():
    """o contorno de luz neon em volta de tudo: a cor vai mudando em volta (ciano em cima à esquerda, magenta, laranja
    embaixo à direita); por dentro é forte, por fora é pontilhado, como a luz se espalhando"""
    def crescer(m):
        n = m.copy()
        n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
        return n
    cheio = b.img[..., 3] > 0
    um = crescer(cheio)
    dois = crescer(um)
    tres = crescer(dois)
    t = np.clip(((b.px - 8) * 0.6 + (b.py + 8) * 0.8) / 80.0, 0, 1)   # 0 em cima à esquerda, 1 embaixo à direita
    def cor_de(t0, forte):
        if t0 < 0.4:
            r = CIANO
        elif t0 < 0.7:
            r = MAGENTA
        else:
            r = LARANJA
        return r[2] if forte else r[1]
    for y, x in zip(*np.nonzero(um & ~cheio)):
        b.img[y, x] = (*cor_de(t[y, x], True), 255)
    for y, x in zip(*np.nonzero(dois & ~um)):
        b.img[y, x] = (*cor_de(t[y, x], False), 255)
    for y, x in zip(*np.nonzero(tres & ~dois)):
        if (y + min(x, b.W - 1 - x)) % 2 == 0:   # o pontilhado espelhado
            b.img[y, x] = (*cor_de(t[y, x], False), 255)


if __name__ == "__main__":
    b.BROWNIE = AMARGO
    b.CALDA = CALDA_ESCURA
    b.OLHO = [(120, 10, 110), (220, 40, 200), (255, 140, 240)]   # os olhos acesos em magenta
    b.desenhar()
    roupa()
    with b.deslocado(b.CABECA_DESCE):
        fone()
    contorno_neon()
    b.conferencia("browneon")
