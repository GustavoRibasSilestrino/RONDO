"""Browcoral (raro, linha 2, coluna 11): o coral. Coral crescendo na cabeça (a base encaroçada e os galhos grossos com as
pontas em bolota) e os pontinhos dos pólipos; a gola de espuma do mar branca e fofa,
o colar de pérolas com a concha rosa e as bolhinhas subindo em volta.  python browcoral.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

CORAL = [(90, 10, 24), (160, 30, 44), (220, 70, 62), (248, 118, 90), (255, 166, 128), (255, 212, 186)]
ESPUMA = [(120, 150, 176), (176, 206, 226), (220, 238, 248), (240, 248, 252), (250, 253, 255), (255, 255, 255)]
PEROLA = [(150, 140, 160), (210, 204, 222), (240, 236, 248), (255, 255, 255)]
CONCHA = [(150, 50, 90), (220, 100, 140), (248, 160, 186), (255, 210, 224)]
BOLHA = [(110, 190, 230), (200, 240, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 10):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def corais():
    """o coral crescendo na cabeça: uma base encaroçada cobrindo o alto e os galhos grossos e curtos saindo dela,
    espelhados, com as pontas em bolota mais claras e os pontinhos dos pólipos"""
    galhos = [
        [(24.0, 10.0, 3.4), (20.0, 2.0, 3.0), (18.0, -5.0, 2.6)],
        [(22.0, 9.0, 3.2), (14.0, 4.0, 2.8), (8.0, 1.0, 2.4)],
        [(20.0, 3.0, 2.4), (25.0, -3.0, 2.2)],
        [(15.0, 4.0, 2.2), (12.0, -2.0, 2.2)],
        [(12.0, 6.0, 2.2), (7.0, 9.0, 2.0)],
    ]
    pontas = [(18.0, -5.5, 3.0), (8.0, 0.5, 2.8), (25.0, -3.5, 2.6), (12.0, -2.5, 2.6), (6.5, 9.5, 2.4)]
    d = np.maximum(b.bola(MEIO, 14.0, 20.0, 7.0), b.py - 15.5)          # a base sobre a cabeça
    d = d + 0.7 * np.sin(np.abs(b.px - MEIO) * 1.3) * np.cos(b.py * 1.1)  # encaroçada
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        for g in galhos:
            d = np.minimum(d, tubo([(x(px), y, r) for px, y, r in g]))
        for px, y, r in pontas:
            d = np.minimum(d, b.bola(x(px), y, r))
    d = np.minimum(d, tubo([(MEIO, 9.0, 3.2), (MEIO, 0.0, 2.6)]))
    d = np.minimum(d, b.bola(MEIO, -1.0, 3.0))
    m, _ = b.peca("coral", d, CORAL, 2.4, cortes=CORTES, linha=CORAL[0])
    for lado in (-1, 1):
        for px, y, r in pontas:
            cx = MEIO + lado * (px - MEIO)
            b.clarear(m & (b.bola(cx - 0.6, y - 0.6, r * 0.6) <= 0), CORAL)
    b.clarear(m & (b.bola(MEIO - 0.6, -1.6, 1.8) <= 0), CORAL)
    # os pontinhos dos pólipos, espelhados
    for x, y in ((17, 3), (14, 6), (11, 2), (21, 0), (19, 8), (24, 12), (27, 11), (10, 9)):
        for xx in (x, 63 - x):
            if m[y + b.OY, xx + b.OX]:
                b.ponto(xx, y, CORAL[5])
                if m[y + 1 + b.OY, xx + b.OX]:
                    b.ponto(xx, y + 1, CORAL[1])
    # a sombra da base do coral na testa
    sombra = (b.yy == 16) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def bolhas():
    """bolhinhas de água subindo em volta, espelhadas: anéis com o brilho em cima"""
    anel = [".##.", "#..#", "#..#", ".##."]
    for x0, y0 in ((-2, 20), (3, 34)):
        for lado in (0, 1):
            for j, linha in enumerate(anel):
                for i, c in enumerate(linha):
                    x = x0 + i if lado == 0 else 63 - (x0 + i)
                    if c == "#":
                        b.ponto(x, y0 + j, BOLHA[0])
            b.ponto(x0 + 1 if lado == 0 else 62 - x0, y0 + 1, BOLHA[1])
    for x, y in ((4, 12), (-4, 30), (7, 26)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, BOLHA[0])

def gola():
    """a gola de espuma do mar, branca e fofa, dando a volta no pescoço, com as bolhinhas"""
    d = np.maximum(b.bola(MEIO, 43.5, 17.0, 5.0), -b.bola(MEIO, 39.0, 9.0, 4.0))
    d = d + 0.6 * np.sin(np.abs(b.px - MEIO) * 1.9) * np.cos(b.py * 1.7)
    m, _ = b.peca("gola", d, ESPUMA, 2.0, cortes=CORTES, linha=ESPUMA[0])
    for x, y in ((20, 44), (25, 46), (17, 42)):   # as bolhinhas da espuma
        for xx in (x, 63 - x):
            b.ponto(xx, y, BOLHA[0])
    # o colar de pérolas em V, logo abaixo da gola, e a concha rosa
    for k in range(5):
        for x in (27 + k, 36 - k):
            y = 48 + k // 2
            b.ponto(x, y, PEROLA[3] if (x + y) % 2 else PEROLA[1])
    concha = ["01111110", "11111111", "11111111", "01111110", "00111100", "00011000"]
    for j, linha in enumerate(concha):
        for i, c in enumerate(linha):
            if c == "1":
                raio = i in (1, 3, 4, 6)   # os sulcos da concha
                cor = CONCHA[1] if raio else (CONCHA[3] if i < 4 else CONCHA[2])
                b.ponto(28 + i, 51 + j, cor)
    for x in range(28, 36):
        if x in (28, 35):
            continue
        b.ponto(x, 50, CONCHA[0])


if __name__ == "__main__":
    b.desenhar()
    b.img[b.peca_de == "orelha", 3] = 0   # o coral cresce onde estavam as orelhas
    with b.deslocado(b.CABECA_DESCE):
        corais()
    gola()
    bolhas()
    b.conferencia("browcoral")
