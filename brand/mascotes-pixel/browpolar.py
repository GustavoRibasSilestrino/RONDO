"""Browpolar (comum, linha 0, coluna 10): fantasia de urso polar. Capuz de pelúcia branca felpuda com orelhas redondas
de dentro azul-gelo e uma abertura de cantos arredondados para o rosto (os olhos ficam à mostra); macacão de pelúcia
branca com a barriga mais clara, patinhas e um floco de neve azul no peito.  python browpolar.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

PELO = [(104, 118, 150), (160, 176, 204), (206, 218, 238), (234, 241, 250), (248, 251, 255), (255, 255, 255)]
GELO = [(36, 82, 132), (72, 132, 190), (132, 190, 234), (196, 230, 250)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def orelhas():
    for cx in (13.5, 49.5):   # espelhadas em volta de x = 31.5
        m, _ = b.peca("capuz", b.felpudo(b.bola(cx, 3.5, 6.0), 0.4), PELO, 3.0, cortes=CORTES, linha=PELO[0])
        dx = 0.8 if cx < 32 else -0.8
        dentro = b.bola(cx + dx, 3.8, 3.4, 3.2) <= 0
        b.pintar(dentro, GELO[2])
        b.pintar(dentro & (b.bola(cx + dx, 4.8, 2.3, 2.1) <= 0), GELO[1])
        b.tufos(m & ~dentro, PELO, int(cx))


def capuz():
    """o capuz cobre a cabeça inteira e desce até o pescoço; o rosto aparece numa abertura de cantos arredondados"""
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.felpudo(b.caixa(8, 4, 55, 44, 11), 0.5), -abertura)
    m, _ = b.peca("capuz", d, PELO, 4.0, cortes=CORTES, linha=PELO[0])
    b.tufos(m, PELO, 21, 0.1)
    # a beira da abertura: um rolinho de pelo mais grosso, com sombra por dentro
    beira = m & (abertura <= 2.2)
    b.clarear(beira & (abertura > 1.0), PELO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, PELO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.tufos(corpo, PELO, 31, 0.08)
    # a barriga mais clara, macia
    barriga = corpo & (b.bola(31.5, 53.5, 9.5, 6.5) <= 0)
    b.clarear(barriga, PELO)
    for cx in (14.5, 49.5):   # braços e patinhas de pelúcia
        m = b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), PELO, 3.0)
        b.tufos(m, PELO, int(cx) + 3, 0.08)
    for x0 in (21, 35):   # pernas de pelúcia, com a sola azul-gelo
        m = b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), PELO, 2.5)
        b.pintar(m & (b.yy >= 66), GELO[1])
        b.pintar(m & (b.yy == 66) & (b.xx > x0) & (b.xx < x0 + 7), GELO[2])
    # o floco de neve azul no peito
    cx, cy = 31, 47
    for dx, dy in ((0, 0), (0, -1), (0, -2), (0, -3), (0, 1), (0, 2), (0, 3), (-1, 0), (-2, 0), (-3, 0), (1, 0), (2, 0),
                   (3, 0), (-1, -1), (1, -1), (-1, 1), (1, 1), (-2, -2), (2, -2), (-2, 2), (2, 2)):
        b.ponto(cx + dx, cy + dy, GELO[1] if abs(dx) + abs(dy) > 2 else GELO[0])
    for dx, dy in ((-1, -3), (1, -3), (-1, 3), (1, 3), (-3, -1), (-3, 1), (3, -1), (3, 1)):
        b.ponto(cx + dx, cy + dy, GELO[2])
    b.ponto(cx, cy, GELO[3])


if __name__ == "__main__":
    b.desenhar()
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas de bolo ficam dentro do capuz
    orelhas()
    capuz()
    b.conferencia("browpolar")
