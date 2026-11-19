"""Browdragão (lendário, linha 4, coluna 4): o dragão. Capuz de cabeça de dragão vermelho de escamas: o focinho em cima
do rosto com as narinas soltando fumaça, os olhos amarelos de pupila fina, os dentes afiados na beira de cima da
abertura (curtos, longe dos olhos), os chifres curvos de marfim e as barbatanas de espinhos dos lados; as asas de
morcego abertas por trás com os ossos dourados, o rabo com a ponta de flecha; o macacão de escamas com as placas de
ouro na barriga e as garras.  python browdragao.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

VERMELHO = [(56, 4, 10), (110, 14, 18), (164, 30, 26), (206, 54, 36), (236, 96, 56), (252, 146, 96)]
MEMBRANA = [(70, 8, 16), (120, 20, 28), (166, 40, 40), (200, 70, 56), (226, 108, 80), (244, 150, 110)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
MARFIM = [(120, 100, 70), (176, 156, 116), (220, 204, 164), (240, 230, 200), (250, 246, 228), (255, 255, 248)]
FUMACA = [(150, 140, 150), (200, 194, 200), (230, 226, 232)]
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


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 12):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def atras():
    # as asas de morcego, espelhadas: a membrana com a beira recortada em arcos e os ossos de ouro
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        asa = poligono([(x(16.0), 40.0), (x(4.0), 22.0), (x(-4.5), 30.0), (x(-5.5), 52.0), (x(14.0), 54.0)])
        for cx, cy in ((-3.0, 44.0), (3.0, 52.0), (-6.0, 37.0)):   # os recortes da beira
            asa = np.maximum(asa, -b.bola(x(cx), cy, 4.0))
        m, _ = b.peca("asa", asa, MEMBRANA, 2.0, cortes=CORTES, linha=VERMELHO[0])
        for x1, y1 in ((4.0, 22.0), (-4.5, 30.0), (-5.5, 50.0), (0.0, 41.0)):   # os ossos
            for t in np.linspace(0, 1, 18):
                xx = int(round(x(16.0) + (x(x1) - x(16.0)) * t))
                yy = int(round(40.0 + (y1 - 40.0) * t))
                if m[yy + b.OY, xx + b.OX]:
                    b.ponto(xx, yy, OURO[3])
    # o rabo saindo por trás, à direita, com a ponta de flecha
    b.peca("rabo", tubo([(42.0, 60.0, 3.2), (50.0, 63.0, 2.6), (57.0, 61.0, 2.0), (60.0, 56.0, 1.4)]), VERMELHO, 1.6,
           cortes=CORTES, linha=VERMELHO[0])
    b.peca("rabo", poligono([(57.5, 55.0), (60.5, 49.0), (63.5, 55.0), (60.5, 57.0)]), OURO, 1.2, cortes=CORTES,
           linha=OURO[0])


def chifres_e_barbatanas():
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        b.peca("chifre", tubo([(x(20.0), 7.0, 2.4), (x(15.0), 1.0, 1.9), (x(13.0), -5.0, 1.4), (x(15.0), -9.0, 0.9)]),
               MARFIM, 1.4, cortes=CORTES, linha=MARFIM[0])
        for y0, comp in ((16.0, 7.0), (24.0, 8.0), (32.0, 6.0)):   # as barbatanas de espinhos
            d = poligono([(x(9.0), y0 - 2.5), (x(9.0 - comp), y0 + 1.0), (x(9.0), y0 + 3.0)])
            b.peca("barbatana", d, MEMBRANA, 1.2, cortes=CORTES, linha=VERMELHO[0])


def capuz():
    abertura = b.caixa(16, 22, 47, 40, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, VERMELHO, 4.0, cortes=CORTES, linha=VERMELHO[0])
    # as escamas: arquinhos escuros em fileiras desencontradas, espelhados
    for y in range(8, 44, 4):
        for x in range(10 + (y // 4) % 2 * 2, 32, 4):
            for xx in (x, 63 - x - 1):
                if m[y + b.OY, xx + b.OX] and abertura[y + b.OY, xx + b.OX] > 2.0 and abs(xx + 0.5 - MEIO) > 7:
                    b.ponto(xx, y, VERMELHO[1]); b.ponto(xx + 1, y, VERMELHO[1])
                    b.ponto(xx, y - 1, VERMELHO[4])
    # o focinho em cima do rosto: a ponte do nariz com as narinas
    focinho = b.caixa(24, 9, 39, 21, 4)
    fm, _ = b.peca("capuz", focinho, VERMELHO, 2.4, cortes=CORTES, linha=VERMELHO[0])
    for x in (27, 36):
        b.ponto(x, 11, VERMELHO[0]); b.ponto(x + (1 if x < 32 else -1), 11, VERMELHO[0])
    # os olhos do dragão no alto, amarelos de pupila fina, espelhados
    for cx in (19.0, 45.0):
        ol = b.bola(cx, 11.0, 2.6, 1.8) <= 0
        b.contorno(ol, "olho_dragao", VERMELHO[0])
        b.pintar(ol, OURO[4])
        b.pintar(ol & (np.abs(b.px - cx) < 0.6), VERMELHO[0])
    b.clarear(m & (abertura <= 1.6), VERMELHO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # os dentes afiados na beira de cima da abertura, espelhados, curtos
    for x in (19, 23, 27, 30):
        for xx in (x, 63 - x):
            b.ponto(xx, 22, MARFIM[5]); b.ponto(xx, 23, MARFIM[3])
    # a fumacinha saindo das narinas
    for x, y, c in ((26, 6, 1), (25, 4, 2), (26, 2, 1), (37, 6, 1), (38, 4, 2), (37, 2, 1)):
        b.ponto(x, y, FUMACA[c])


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, VERMELHO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # as placas de ouro na barriga, em fileiras
    barriga = corpo & (np.abs(b.px - MEIO) < 7.0) & (b.py > 45)
    b.vestir("corpo", d_corpo, OURO, 4.0, onde=barriga)
    for y in (49, 53, 57):
        b.pintar(barriga & (b.yy == y), OURO[1])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), VERMELHO, 3.0)
        for dx in (-2, 0, 2):   # as garras
            b.ponto(int(cx) + dx, 56, MARFIM[5]); b.ponto(int(cx) + dx, 55, MARFIM[3])
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), VERMELHO, 2.5)
        for x in (x0 + 1, x0 + 3, x0 + 5):
            b.ponto(x, 67, MARFIM[5])


if __name__ == "__main__":
    b.desenhar(atras=atras)
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    chifres_e_barbatanas()
    capuz()
    b.conferencia("browdragao")
