"""Browsombra (lendário, linha 4, coluna 13): a sombra. Capuz negro-violeta de orelhas pontudas que se desmancha em fumaça
nas pontas; o rosto do brownie no escuro do capuz, com os olhos acesos em ciano; a capa negra de barra esfarrapada
soltando fiapos de fumaça; o símbolo de lua acesa em magenta no peito; as sombras flutuando em volta.  python browsombra.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

NEGRO = [(6, 4, 12), (14, 10, 26), (24, 18, 42), (36, 28, 60), (52, 42, 82), (76, 64, 110)]
FUMACA = [(40, 30, 64), (64, 52, 96), (96, 84, 130)]
MAGENTA = [(120, 20, 130), (210, 60, 220), (250, 150, 250)]
CIANO = [(20, 90, 130), (80, 200, 240), (200, 250, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def poligono(pontos):
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]))
    if area < 0:
        pontos = pontos[::-1]
    d = np.full(b.img.shape[:2], -99.0)
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]):
        nx, ny = y1 - y0, -(x1 - x0)
        n = np.hypot(nx, ny)
        d = np.maximum(d, ((b.px - x0) * nx + (b.py - y0) * ny) / n)
    return d


def fiapos(pontos):
    """fiapos de fumaça: pontinhos subindo e se apagando, espelhados"""
    for x, y, c in pontos:
        for xx in (x, 63 - x):
            b.ponto(xx, y, FUMACA[c])


def orelhas():
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        pts = [(x(10.0), 14.0), (x(11.5), -6.0), (x(23.0), 7.0)]
        b.peca("capuz", poligono(pts), NEGRO, 2.0, cortes=CORTES, linha=NEGRO[0])
        dentro = poligono([(x(12.5), 9.0), (x(13.0), -1.0), (x(19.0), 6.0)]) <= 0
        b.pintar(dentro, MAGENTA[0])
    fiapos([(11, -8, 2), (10, -10, 1), (12, -12, 0), (13, -9, 1)])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 6)
    borda = 0.6 * np.sin(np.abs(b.px - MEIO) * 1.7) * np.cos(b.py * 1.3)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11) + borda, -abertura)
    m, _ = b.peca("capuz", d, NEGRO, 4.0, cortes=CORTES, linha=NEGRO[0])
    for x, y in ((12, 10), (13, 9), (11, 12)):   # um brilho fraco violeta no pano
        b.ponto(x, y, NEGRO[5])
    # o rosto no escuro do capuz: tudo dois tons mais escuro, mais ainda perto da beira
    rosto = (abertura <= 0) & (b.peca_de == "cabeca")
    for rampa in (b.BROWNIE, b.CALDA):
        b.escurecer(rosto, rampa, 2)
        b.escurecer(rosto & (abertura > -3.0), rampa, 1)
    fiapos([(9, 4, 2), (7, 2, 1), (8, 0, 0), (6, 18, 1), (5, 16, 0), (6, 30, 1), (4, 28, 0)])


def capa():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, NEGRO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), NEGRO, 3.0)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), NEGRO, 2.5)
    # a barra esfarrapada: as pontas rasgadas da capa penduradas por cima das pernas, espelhadas
    for x0, comp in ((17, 4), (20, 3), (23, 5), (26, 3), (29, 4)):
        for k in range(comp):
            meia = max(0, 1 - k // 2)
            for x in range(x0 - meia, x0 + meia + 1):
                for xx in (x, 63 - x):
                    b.ponto(xx, 61 + k, NEGRO[2] if k < comp - 1 else NEGRO[1])
    fiapos([(18, 64, 2), (17, 66, 1), (19, 68, 0), (24, 64, 1), (25, 66, 0), (12, 58, 1), (11, 60, 0)])
    # o símbolo de lua acesa no peito
    lua = (b.bola(MEIO, 51.0, 4.2) <= 0) & (b.bola(MEIO + 1.8, 49.8, 3.6) > 0)
    b.pintar(lua, MAGENTA[1])
    b.pintar(lua & (b.px < MEIO - 1.5), MAGENTA[2])
    for x, y in ((35, 47), (37, 50)):   # as estrelinhas ao lado da lua (é um símbolo, não espelha)
        b.ponto(x, y, CIANO[2])


def sombras():
    """as sombras flutuando em volta: bolhas de fumaça escura com o miolo violeta, espelhadas"""
    for cx, cy, r in ((1.0, 22.0, 2.4), (4.0, 46.0, 2.0), (-3.0, 36.0, 1.6)):
        for x in (cx, 63.0 - cx):
            b.peca("sombra", b.bola(x + 0.5, cy, r), NEGRO, 1.2, cortes=CORTES, linha=NEGRO[0])
            b.ponto(int(x), int(cy), NEGRO[5])


if __name__ == "__main__":
    b.OLHO = [(20, 90, 130), (80, 200, 240), (200, 250, 255)]   # os olhos acesos em ciano
    b.desenhar()
    capa()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    orelhas()
    capuz()
    sombras()
    b.conferencia("browsombra")
