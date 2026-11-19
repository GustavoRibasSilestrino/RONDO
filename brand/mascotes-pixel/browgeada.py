"""Browgeada (épico, linha 3, coluna 6): a geada. O browniezinho inteiro congelado (corpo de gelo azul-claro, a calda virou
neve), com os pinguinhos de gelo pendurados na beira da cabeça; a coroa de gelo de três pontas com a pedra turquesa; a
gola de geada em V com os cristais e as estrelinhas de gelo brilhando em volta.  python browgeada.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

CORPO_GELO = [(40, 70, 140), (70, 110, 190), (110, 156, 226), (150, 192, 246), (190, 222, 255), (228, 244, 255)]
NEVE = [(110, 130, 180), (160, 180, 220), (204, 220, 244), (230, 240, 252), (246, 250, 255), (255, 255, 255)]
GELO = [(12, 56, 116), (30, 110, 186), (66, 170, 228), (124, 214, 248), (188, 240, 255), (240, 254, 255)]
TURQUESA = [(10, 90, 110), (30, 170, 180), (120, 236, 230), (220, 255, 250)]
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


def coroa():
    """a coroa de gelo: o aro e três pontas lapidadas (a do meio mais alta) com a pedra turquesa"""
    pontas = [(21.5, -4.0, 4.0), (MEIO, -9.13, 4.6), (42.5, -4.0, 4.0)]
    d = b.caixa(17, 4, 46, 11, 1)
    for cx, topo, larg in pontas:
        d = np.minimum(d, poligono([(cx - larg, 5.0), (cx, topo), (cx + larg, 5.0)]))
    m, _ = b.peca("coroa", d, GELO, 1.8, cortes=CORTES, linha=GELO[0])
    for cx, topo, larg in pontas:   # o fio de luz no meio de cada ponta e a face escura à direita
        b.pintar(m & (np.abs(b.px - cx) < 0.6) & (b.py < 5), GELO[5])
        b.pintar(m & (b.px > cx + 0.6) & (b.py < 5) & (b.px < cx + larg), GELO[1])
    for x in range(17, 47):
        b.ponto(x, 5, GELO[4] if x < 32 else GELO[3])
        b.ponto(x, 10, GELO[1])
    b.peca("pedra", b.bola(MEIO, 7.5, 2.2, 2.0), TURQUESA + TURQUESA[-2:], 1.0, linha=TURQUESA[0])
    b.ponto(31, 7, TURQUESA[3])
    sombra = (b.yy == 12) & (b.xx >= 17) & (b.xx <= 46) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def pinguinhos():
    """os pinguinhos de gelo pendurados na beira de baixo da cabeça e dos braços, espelhados"""
    for x, comp in ((14, 3), (18, 2), (22, 3)):
        for xx in (x, 63 - x):
            for k in range(comp):
                b.ponto(xx, 46 + k, GELO[4] if k == 0 else (GELO[3] if k < comp - 1 else GELO[2]))
    for cx in (14.5, 49.5):
        x = int(cx)
        for k in range(2):
            b.ponto(x, 56 + k, GELO[4] if k == 0 else GELO[2])


def gola():
    """a gola de geada em V no peito, com os cristais na beira"""
    corpo = (b.peca_de == "corpo") & (b.img[..., 3] > 0)
    v = corpo & (b.py > 44) & (np.abs(b.px - MEIO) < 9.5 - (b.py - 44) * 1.1)
    b.pintar(v, NEVE[3])
    b.pintar(v & (b.px < MEIO), NEVE[4])
    beira = v & ~(np.roll(v, -1, 0) & np.roll(v, 1, 1) & np.roll(v, -1, 1))
    b.pintar(beira, GELO[2])
    for x, y in ((25, 46), (28, 48)):   # os cristaizinhos na beira, espelhados
        for xx in (x, 63 - x):
            b.ponto(xx, y, GELO[5])
    for y in (47, 49):
        b.ponto(31, y, GELO[3]); b.ponto(32, y, GELO[3])


def estrelinhas():
    """as estrelinhas de gelo brilhando em volta: losangos de quatro pontas, espelhados"""
    for x, y, t in ((1, 22, 3), (-4, 38, 2), (4, 6, 2), (-2, 52, 1)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, GELO[5])
            for k in range(1, t + 1):
                cor = GELO[4] if k == 1 else (GELO[3] if k == 2 else GELO[2])
                for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                    b.ponto(xx + dx, y + dy, cor)
            if t >= 2:
                for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
                    b.ponto(xx + dx, y + dy, GELO[2])


if __name__ == "__main__":
    b.BROWNIE = CORPO_GELO
    b.CALDA = NEVE
    b.desenhar()
    gola()
    with b.deslocado(b.CABECA_DESCE):
        coroa()
    pinguinhos()
    estrelinhas()
    b.conferencia("browgeada")
