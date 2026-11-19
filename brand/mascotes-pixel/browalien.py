"""Browalien (incomum, linha 1, coluna 5): fantasia de alienígena. Capuz verde-limão liso com manchinhas e duas antenas
de mola com bolinhas amarelas brilhando, o rosto à mostra numa abertura de cantos arredondados; macacão espacial
prateado com gola, punhos e cinto verdes brilhantes e um disco voador no peito.  python browalien.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ALIEN = [(14, 60, 30), (30, 110, 46), (60, 160, 60), (110, 210, 80), (170, 240, 120), (220, 255, 180)]
PRATA = [(60, 66, 84), (100, 108, 128), (150, 158, 178), (196, 202, 218), (228, 232, 242), (250, 252, 255)]
AMARELO = [(180, 120, 10), (246, 200, 40), (255, 240, 130), (255, 255, 230)]
CIANO = [(20, 120, 150), (60, 200, 230), (170, 245, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def antenas():
    """duas antenas que saem do alto do capuz e abrem para os lados, espelhadas, com a bolinha brilhando na ponta"""
    caminho = [(24, 6), (24, 5), (23, 4), (23, 3), (22, 2), (22, 1), (21, 0), (20, -1), (20, -2), (19, -3)]
    for x, y in caminho:
        for xx in (x, 63 - x):
            b.ponto(xx - 1, y, ALIEN[0]); b.ponto(xx, y, ALIEN[3]); b.ponto(xx + 1, y, ALIEN[0])
    for cx in (18.5, 44.5):
        m, _ = b.peca("antena", b.bola(cx, -5.0, 2.8), AMARELO + AMARELO[-2:], 1.6, cortes=(0.4, 0.6, 0.8, 0.95, 1.0),
                      linha=AMARELO[0])
        b.ponto(int(cx) - 1, -6, AMARELO[3])
    # o brilho em volta das bolinhas, espelhado
    for x, y in ((14, -5), (22, -5), (18, -9)):
        b.ponto(x, y, AMARELO[2]); b.ponto(63 - x, y, AMARELO[2])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, ALIEN, 4.0, cortes=CORTES, linha=ALIEN[0])
    for x, y in ((13, 9), (14, 8), (15, 8), (16, 8), (13, 10)):   # brilho de pele lisa
        b.ponto(x, y, ALIEN[5])
    for x, y in ((24, 11), (38, 9), (11, 24), (51, 28), (31, 7), (12, 36), (50, 38)):   # manchinhas
        for dx, dy in ((0, 0), (1, 0), (0, 1)):
            if m[y + dy + b.OY, x + dx + b.OX]:
                b.ponto(x + dx, y + dy, ALIEN[2])
    b.clarear(m & (abertura <= 1.6), ALIEN)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, PRATA, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), PRATA, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, ALIEN)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), PRATA, 2.5)
    # o cinto verde brilhante dando a volta
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 56, ALIEN, None, livre)
    # o disco voador no peito: a cúpula de vidro, o prato prateado com luzinhas e o raio de luz embaixo
    cupula = b.bola(31.5, 47.5, 3.0, 2.4) <= 0
    b.contorno(cupula, "disco", PRATA[0])
    b.pintar(cupula, CIANO[1])
    b.ponto(30, 46, CIANO[2])
    prato = b.bola(31.5, 49.5, 7.0, 1.8) <= 0
    b.contorno(prato, "disco", PRATA[0])
    b.pintar(prato, PRATA[4])
    b.pintar(prato & (b.py > 49.5), PRATA[2])
    for x in (27, 31, 32, 36):
        b.ponto(x, 50, AMARELO[1])
    for y in range(52, 55):
        meia = 1 + (y - 52)
        for x in range(32 - meia, 32 + meia):
            b.ponto(x, y, ALIEN[4] if (x + y) % 2 else ALIEN[3])


if __name__ == "__main__":
    b.desenhar()
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    antenas()
    capuz()
    b.conferencia("browalien")
