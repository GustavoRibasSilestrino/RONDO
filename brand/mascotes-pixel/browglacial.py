"""Browglacial (lendário, linha 4, coluna 8): o glacial, o rei das geleiras. A aurora boreal ondulando por trás (verde,
azul e violeta); o elmo de gelo grosso e lascado, com as rachaduras e a beira de geada em volta do rosto (o rosto à
mostra numa abertura de cantos arredondados); a coroa de cinco lascas de gelo com a pedra azul; a armadura de blocos de
gelo com as ombreiras de lascas pontudas e o cristal hexagonal no peito; os flocos de neve caindo.  python browglacial.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

GELO = [(16, 50, 110), (34, 96, 170), (70, 150, 216), (124, 196, 240), (186, 230, 252), (240, 252, 255)]
GEADA = [(150, 180, 210), (200, 222, 240), (232, 244, 252), (250, 254, 255)]
AZUL = [(10, 30, 110), (24, 70, 190), (70, 130, 240), (170, 210, 255)]
AURORA = [(40, 200, 140), (60, 210, 200), (90, 160, 240), (150, 110, 230)]
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


def aurora():
    """as cortinas da aurora boreal atrás da cabeça: colunas de luz que sobem e descem em onda, verdes embaixo e violeta
    em cima, sumindo pontilhadas nas pontas; espelhadas"""
    ax = np.abs(b.px - MEIO)
    topo = 2.0 + 4.0 * np.sin(ax * 0.32) + 2.0 * np.sin(ax * 0.9)
    alt = 16.0
    t = (b.py - topo) / alt                     # 0 em cima, 1 embaixo
    cortina = (t >= 0) & (t <= 1) & (ax > 5) & (ax < 37)
    xi = np.floor(ax).astype(int)
    some = ((t < 0.18) | (t > 0.85)) & ((b.yy.astype(int) + xi) % 2 == 1)   # as pontas se apagando
    raia = (xi % 3 == 0)                                                    # as dobras da cortina
    m = cortina & ~some
    cores = (AURORA[3], AURORA[2], AURORA[1], AURORA[0])
    for k, cor in enumerate(cores):
        b.pintar(m & (t >= k / 4) & (t < (k + 1) / 4 + 0.001), cor)
    b.pintar(m & raia & (t > 0.3), GEADA[2])
    b.peca_de[m] = "aurora"

def elmo():
    abertura = b.caixa(16, 20, 47, 39, 5)
    serra = 0.9 * np.abs(((np.abs(b.px - MEIO) + b.py) / 3.0) % 2 - 1)   # a beira lascada, em dentes
    d = np.maximum(b.caixa(8, 5, 55, 44, 11) + serra, -abertura)
    m, _ = b.peca("elmo", d, GELO, 4.0, cortes=CORTES, linha=GELO[0])
    # as rachaduras, espelhadas
    for pts in (((12, 14), (13, 15), (13, 16), (14, 17)), ((11, 30), (12, 31), (12, 32)), ((19, 9), (20, 10), (21, 10))):
        for x, y in pts:
            for xx in (x, 63 - x):
                b.ponto(xx, y, GELO[5])
    # a beira de geada em volta do rosto
    geada = m & (abertura <= 2.2)
    b.pintar(geada, GEADA[2])
    b.pintar(geada & (abertura <= 1.0), GEADA[1])
    b.pintar(geada & (b.py < 30) & (b.px < MEIO) & (abertura > 1.2), GEADA[3])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def lasca(base, topo, larg):
    (bx, by), (tx, ty) = base, topo
    comp = np.hypot(tx - bx, ty - by)
    ux, uy = (tx - bx) / comp, (ty - by) / comp
    nx, ny = -uy, ux
    k = larg * 1.3
    pts = [(bx + nx * larg, by + ny * larg), (tx - ux * k + nx * larg, ty - uy * k + ny * larg), (tx, ty),
           (tx - ux * k - nx * larg, ty - uy * k - ny * larg), (bx - nx * larg, by - ny * larg)]
    m = poligono(pts) <= 0
    lado = (b.px - bx) * nx + (b.py - by) * ny
    claro = lado * (1 if (nx < 0 or (nx == 0 and ny < 0)) else -1) > 0
    b.contorno(m, "gelo", GELO[0])
    b.pintar(m, GELO[3])
    b.pintar(m & claro, GELO[4])
    b.pintar(m & ~claro & (np.abs(lado) > larg - 1.1), GELO[2])
    b.pintar(m & (np.abs(lado) < 0.5), GELO[5])


def coroa():
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        lasca((x(16.0), 8.0), (x(12.0), -3.0), 2.6)
        lasca((x(24.0), 7.0), (x(22.5), -8.0), 3.0)
    lasca((MEIO, 7.0), (MEIO, -13.0), 3.6)
    b.peca("pedra", b.bola(MEIO, 6.0, 2.2, 2.4), AZUL + AZUL[-2:], 1.0, cortes=(0.3, 0.5, 0.7, 0.9, 1.0), linha=GELO[0])
    b.ponto(31, 5, AZUL[3])


def armadura():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, GELO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # os blocos de gelo: as juntas claras em grade, espelhadas
    for y in (50, 56):
        b.pintar(corpo & (b.yy == y), GELO[4])
    for x in (22, 27):
        for xx in (x, 63 - x):
            for y in range(45, 62):
                if corpo[y + b.OY, xx + b.OX] and y not in (50, 56):
                    b.ponto(xx, y, GELO[2])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), GELO, 3.0)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, AZUL + AZUL[-2:])
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), GELO, 2.5)
    # o cristal hexagonal no peito
    hexa = poligono([(MEIO - 2.0, 47.0), (MEIO + 2.0, 47.0), (MEIO + 4.0, 50.5), (MEIO + 2.0, 54.0), (MEIO - 2.0, 54.0),
                     (MEIO - 4.0, 50.5)]) <= 0
    b.contorno(hexa, "cristal", AZUL[0])
    b.pintar(hexa, AZUL[2])
    b.pintar(hexa & (b.px < MEIO), AZUL[3])
    b.pintar(hexa & (b.px >= MEIO) & (b.py > 50.5), AZUL[1])
    b.ponto(30, 48, GELO[5])


def ombreiras():
    """as ombreiras de lascas pontudas, espelhadas, por cima de tudo"""
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        lasca((x(14.0), 46.0), (x(8.0), 38.0), 2.0)
        lasca((x(17.0), 45.0), (x(15.0), 37.0), 1.8)


def neve():
    """os flocos de neve caindo, espelhados: cruzinhas com o miolo branco"""
    for x, y in ((2, 14), (-4, 30), (5, 44), (0, 56)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, GEADA[3])
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                b.ponto(xx + dx, y + dy, GEADA[1])


if __name__ == "__main__":
    b.desenhar(atras=aurora)
    armadura()
    b.img[b.peca_de == "orelha", 3] = 0   # o elmo cobre as orelhas
    elmo()
    coroa()
    ombreiras()
    neve()
    b.conferencia("browglacial")
