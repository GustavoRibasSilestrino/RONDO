"""Browcoelho (incomum, linha 1, coluna 10): fantasia de coelhinho. Capuz branco e felpudo com as duas orelhas compridas
de dentro rosa e o rosto à mostra numa abertura de cantos arredondados; macacão branco com a barriga rosa, as patinhas
com almofadinhas, o laço rosa no pescoço, o pompom do rabo aparecendo do lado e uma cenoura na mão.  python browcoelho.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

BRANCO = [(150, 120, 160), (200, 176, 210), (232, 216, 238), (246, 238, 248), (252, 249, 253), (255, 255, 255)]
ROSA = [(130, 40, 90), (190, 70, 130), (228, 112, 168), (244, 156, 198), (252, 196, 222), (255, 228, 240)]
LARANJA = [(120, 44, 10), (190, 80, 18), (234, 120, 30), (250, 162, 60), (255, 200, 110), (255, 230, 170)]
FOLHA = [(20, 80, 30), (50, 140, 50), (110, 200, 80)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def rabo():
    """o pompom do rabo, branco e fofo, aparecendo atrás do corpo do lado direito"""
    d = b.felpudo(b.bola(50.5, 59.0, 4.2, 3.8), 0.6)
    m, _ = b.peca("rabo", d, BRANCO, 2.0, cortes=CORTES, linha=BRANCO[0])
    b.tufos(m, BRANCO, 5, 0.12)


def orelhas():
    """as orelhas compridas em pé, um pouco abertas, espelhadas, com o dentro rosa"""
    for lado in (-1, 1):
        cx = MEIO + lado * 9.5
        # elipse comprida inclinada para fora
        ang = np.radians(lado * 10)
        dx, dy = b.px - cx, b.py - 0.0
        u = dx * np.cos(ang) + dy * np.sin(ang)
        v = -dx * np.sin(ang) + dy * np.cos(ang)
        d = np.hypot(u / 5.0, v / 12.0) - 1.0
        d = d * 5.0
        m, _ = b.peca("capuz", d, BRANCO, 2.4, cortes=CORTES, linha=BRANCO[0])
        dentro = (np.hypot(u / 2.4, (v + 1.0) / 9.0) <= 1.0) & m
        b.pintar(dentro, ROSA[3])
        b.pintar(dentro & (u * lado > 0.6), ROSA[2])
        b.pintar(dentro & (v > 5), ROSA[2])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.felpudo(b.caixa(8, 5, 55, 44, 11), 0.35), -abertura)
    m, _ = b.peca("capuz", d, BRANCO, 4.0, cortes=CORTES, linha=BRANCO[0])
    b.tufos(m & (abertura > 2.5), BRANCO, 7, 0.06)
    b.clarear(m & (abertura <= 1.6), BRANCO)
    # a costura rosa em volta da abertura, com o coraçãozinho em cima no meio
    beira = m & (abertura > 1.6) & (abertura <= 2.6)
    b.pintar(beira, ROSA[3])
    for x, y in ((30, 15), (31, 16), (32, 16), (33, 15), (30, 16), (33, 16), (31, 17), (32, 17)):
        b.ponto(x, y, ROSA[2] if x >= 32 else ROSA[3])
    b.ponto(31, 15, ROSA[4]); b.ponto(32, 15, ROSA[4])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, BRANCO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.vestir("corpo", b.bola(MEIO, 55.0, 6.5, 5.5), ROSA[2:], 3.0, onde=corpo)   # a barriga rosa
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), BRANCO, 3.0)
        for dx in (-1, 1):
            b.ponto(int(cx) + dx, 54, ROSA[3])   # as almofadinhas
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), BRANCO, 2.5)
        for x in (x0 + 2, x0 + 4):
            b.ponto(x, 66, ROSA[3])


def laco():
    """o laço rosa no pescoço: duas alças espelhadas e o nó no meio"""
    ax = np.abs(b.px - MEIO)
    alcas = np.maximum(np.abs(b.py - 46.5) - (1.0 + 0.5 * ax), ax - 7.5)
    alcas = np.maximum(alcas, b.bola(MEIO, 46.5, 8.0, 4.2))
    b.peca("laco", alcas, ROSA, 1.6, cortes=CORTES, linha=ROSA[0])
    for x in (27, 36):   # a dobra de cada alça, espelhada
        b.ponto(x, 46, ROSA[1]); b.ponto(x, 47, ROSA[1])
    no = b.caixa(30, 44, 33, 49, 1)
    b.peca("laco", no, ROSA, 1.0, cortes=CORTES, linha=ROSA[0])
    b.ponto(31, 45, ROSA[5]); b.ponto(32, 45, ROSA[4])


def cenoura():
    """a cenoura na mão esquerda, com a ponta para baixo e as folhinhas em cima"""
    t = np.clip((b.py - 45.0) / 13.0, 0, 1)
    d = np.maximum(np.abs(b.px - 10.5) - 2.6 * (1 - t) - 0.3, np.maximum(45.0 - b.py, b.py - 58.0))
    m, _ = b.peca("cenoura", d, LARANJA, 1.4, cortes=CORTES, linha=LARANJA[0])
    for y in (48, 51, 54):
        b.ponto(10 if y % 2 else 11, y, LARANJA[1])
    for x, y, c in ((9, 44, FOLHA[1]), (10, 43, FOLHA[2]), (11, 42, FOLHA[1]), (11, 44, FOLHA[2]), (12, 43, FOLHA[1]),
                    (8, 43, FOLHA[0]), (13, 42, FOLHA[0]), (10, 44, FOLHA[0])):
        b.ponto(x, y, c)
    # a mãozinha segurando por cima
    mao = b.bola(13.0, 51.0, 2.4, 2.0)
    b.peca("braco", mao, BRANCO, 1.2, cortes=CORTES, linha=BRANCO[0])


if __name__ == "__main__":
    b.desenhar(atras=rabo)
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas de bolo ficam dentro do capuz
    orelhas()
    capuz()
    laco()
    cenoura()
    b.conferencia("browcoelho")
