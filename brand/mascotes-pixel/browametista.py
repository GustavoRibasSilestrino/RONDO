"""Browametista (épico, linha 3, coluna 8): a ametista. O brownie dentro de um geodo: o capuz é a casca de pedra áspera
roxo-acinzentada, com a faixa de quartzo branco em volta do rosto e os dentinhos de ametista apontando para dentro (curtos,
longe dos olhos); o tufo de cristais de ametista saindo em cima; o manto roxo com a gola de quartzo e o pingente de
fatia de geodo; brilhinhos lilases em volta.  python browametista.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

PEDRA = [(26, 18, 36), (46, 34, 62), (68, 54, 88), (90, 76, 112), (116, 102, 138), (146, 134, 166)]
AMETISTA = [(50, 10, 90), (90, 30, 150), (140, 60, 206), (184, 106, 240), (220, 160, 255), (246, 220, 255)]
QUARTZO = [(150, 136, 176), (200, 190, 222), (232, 226, 246), (246, 244, 252), (252, 251, 255), (255, 255, 255)]
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


def ponta(base, topo, larg):
    """um cristal de ametista pontudo, em qualquer inclinação: a face da esquerda clara e o fio de luz"""
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
    b.contorno(m, "cristal", AMETISTA[0])
    b.pintar(m, AMETISTA[2])
    b.pintar(m & claro, AMETISTA[4])
    b.pintar(m & ~claro & (np.abs(lado) > larg - 1.1), AMETISTA[1])
    b.pintar(m & (np.abs(lado) < 0.5), AMETISTA[5])


def tufo():
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        ponta((x(25.0), 8.0), (x(21.0), -5.0), 2.8)
        ponta((x(18.0), 9.0), (x(11.0), 0.0), 2.4)
    ponta((MEIO, 8.0), (MEIO, -10.0), 3.4)


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    casca = b.caixa(8, 5, 55, 44, 11) + 0.7 * np.sin(np.abs(b.px - MEIO) * 1.3) * np.cos(b.py * 1.1)
    d = np.maximum(casca, -abertura)
    m, _ = b.peca("capuz", d, PEDRA, 4.0, cortes=CORTES, linha=PEDRA[0])
    # a pedra: umas rachaduras e lascas claras, espelhadas, em vez de textura
    for pts in (((11, 12), (12, 13), (12, 14)), ((10, 30), (11, 31)), ((14, 41), (15, 40)), ((22, 7), (23, 8))):
        for x, y in pts:
            for xx in (x, 63 - x):
                b.ponto(xx, y, PEDRA[0])
    for x, y in ((13, 9), (14, 8), (10, 22), (10, 23)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, PEDRA[5])
    # o miolo do geodo: a faixa de quartzo branco e, mais para dentro, a camada de cristais de ametista
    quartzo = m & (abertura <= 5.0) & (abertura > 3.0)
    b.pintar(quartzo, QUARTZO[3])
    b.pintar(quartzo & (b.py < 30) & (b.px < MEIO), QUARTZO[5])
    b.pintar(quartzo & (abertura > 4.3), QUARTZO[1])
    cristais = m & (abertura <= 3.0)
    b.pintar(cristais, AMETISTA[2])
    # as facetas dos cristaizinhos: riscos claros e escuros alternando em volta, espelhados
    ang = np.degrees(np.arctan2(b.py - 29.0, np.abs(b.px - MEIO)))
    faceta = np.floor((ang + 90) / 12.0) % 2 == 0
    b.pintar(cristais & faceta, AMETISTA[4])
    b.pintar(cristais & (abertura <= 1.0), AMETISTA[1])
    b.pintar(cristais & faceta & (abertura <= 1.0), AMETISTA[3])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def manto():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, AMETISTA, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), AMETISTA, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, QUARTZO)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), PEDRA, 2.5)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, QUARTZO, None, livre)


def pingente():
    """a gola de quartzo em V e o pingente de fatia de geodo: anéis de pedra, quartzo e ametista com o miolo escuro"""
    for y in range(45, 51):
        meia = 7 - (y - 45)
        b.ponto(31 - meia, y, QUARTZO[5]); b.ponto(32 + meia, y, QUARTZO[2])
    r = np.hypot((b.px - MEIO) / 1.0, (b.py - 54.0) / 1.1)
    for raio, cor in ((4.2, PEDRA[1]), (3.4, QUARTZO[4]), (2.6, AMETISTA[3]), (1.6, AMETISTA[1]), (0.8, AMETISTA[0])):
        b.pintar(r <= raio, cor)
    b.pintar((r <= 2.6) & (r > 1.6) & (b.px < MEIO) & (b.py < 54), AMETISTA[5])
    for x in (31, 32):
        b.ponto(x, 49, QUARTZO[4])


def brilhos():
    for x, y, t in ((0, 18, 2), (-4, 36, 1), (5, 2, 1), (-2, 50, 1)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, AMETISTA[5])
            for k in range(1, t + 1):
                for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                    b.ponto(xx + dx, y + dy, AMETISTA[4] if k == 1 else AMETISTA[3])


if __name__ == "__main__":
    b.desenhar()
    manto()
    b.img[b.peca_de == "orelha", 3] = 0   # a casca cobre as orelhas
    tufo()
    capuz()
    pingente()
    brilhos()
    b.conferencia("browametista")
