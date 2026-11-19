"""Browgelo (raro, linha 2, coluna 3): o gelo. Capuz de gelo com as facetas, as rachaduras e o brilho de geada, o rosto à
mostra numa abertura de cantos arredondados com os pinguinhos de gelo na beira de cima; coroa de três pontas de gelo;
lascas de gelo flutuando dos lados; armadura de gelo com o colete azul-escuro e o floco de neve no peito.
python browgelo.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

GELO = [(12, 56, 116), (30, 110, 186), (66, 170, 228), (124, 214, 248), (188, 240, 255), (240, 254, 255)]
FUNDO = [(10, 16, 60), (20, 34, 110), (36, 60, 160), (60, 94, 200), (96, 134, 228), (150, 180, 246)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def poligono(pontos):
    """distância com sinal (aproximada) de um polígono convexo; a ordem dos pontos é acertada sozinha"""
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]))
    if area < 0:
        pontos = pontos[::-1]
    d = np.full(b.img.shape[:2], -99.0)
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]):
        nx, ny = y1 - y0, -(x1 - x0)
        n = np.hypot(nx, ny)
        d = np.maximum(d, ((b.px - x0) * nx + (b.py - y0) * ny) / n)
    return d


def cristal(pontos, eixo_x, nome="gelo"):
    """um cristal de gelo: contorno escuro, a metade da esquerda clara, a da direita mais funda e o fio de luz"""
    m = poligono(pontos) <= 0
    b.contorno(m, nome, GELO[0])
    b.pintar(m, GELO[2])
    b.pintar(m & (b.px < eixo_x), GELO[4])
    b.pintar(m & (b.px >= eixo_x + 1.5), GELO[1])
    b.pintar(m & (np.abs(b.px - eixo_x) < 0.5), GELO[5])
    return m


def lascas():
    """lascas de gelo flutuando dos dois lados da cabeça, espelhadas"""
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (MEIO - v)
        cristal([(x(-1.0), 21.0), (x(1.5), 13.0), (x(4.5), 21.0), (x(1.5), 29.0)], x(1.5))
        cristal([(x(1.0), 35.0), (x(3.0), 31.5), (x(5.0), 35.0), (x(3.0), 39.0)], x(3.0))
    # brilhinhos de geada no ar, espelhados
    for px, py in ((6, 9), (0, 42), (-3, 27)):
        for xx in (px, 63 - px):
            b.ponto(xx, py, GELO[5])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, GELO, 4.0, cortes=CORTES, linha=GELO[0])
    # as facetas do gelo: riscos claros e escuros em diagonal, espelhados
    for x0, y0, comp in ((11, 12, 6), (12, 30, 5), (14, 38, 4)):
        for k in range(comp):
            for xx, passo in ((x0 + k, 1), (63 - x0 - k, -1)):
                b.ponto(xx, y0 + k, GELO[5] if k < 2 else GELO[4])
    for x, y in ((20, 10), (21, 11), (21, 12), (22, 13)):   # uma rachadura de cada lado
        for xx in (x, 63 - x):
            b.ponto(xx, y, GELO[1])
    b.clarear(m & (abertura <= 1.6), GELO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # os pinguinhos de gelo pendurados na beira de cima da abertura, espelhados (curtos, longe dos olhos)
    for x, comp in ((21, 2), (25, 3), (29, 2)):
        for xx in (x, 63 - x):
            for k in range(comp):
                b.ponto(xx, 19 + k, GELO[4] if k == 0 else GELO[3])
            b.ponto(xx, 19 + comp, GELO[1])


def coroa():
    """três pontas de gelo: a do meio reta e alta, as dos lados inclinadas para fora"""
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (MEIO - v)
        cristal([(x(19.0), 8.0), (x(17.5), -4.0), (x(21.5), -1.0), (x(26.0), 7.0)], x(20.5))
    cristal([(MEIO - 4.5, 7.0), (MEIO - 3.5, -3.0), (MEIO, -10.0), (MEIO + 3.5, -3.0), (MEIO + 4.5, 7.0)], MEIO - 0.5)
    # o losango brilhante no meio da ponta maior
    for y, meia in ((-2, 0), (-1, 1), (0, 1), (1, 0)):
        for xx in range(31 - meia, 33 + meia):
            b.ponto(xx, y, GELO[5] if xx < 32 else GELO[3])


def armadura():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, GELO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # o colete azul-escuro em V no meio
    colete = corpo & (np.abs(b.px - MEIO) < 3.0 + (b.py - 44) * 0.55) & (b.py > 44) & (b.py < 61)
    b.vestir("corpo", d_corpo, FUNDO, 4.0, onde=colete)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), GELO, 3.0)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, FUNDO)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), GELO, 2.5)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, FUNDO, None, livre)
    # o floco de neve no peito, 8x8, centralizado entre os pixels 31 e 32
    floco = ["10011001",
             "01011010",
             "00111100",
             "11111111",
             "11111111",
             "00111100",
             "01011010",
             "10011001"]
    for j, linha in enumerate(floco):
        for i, c in enumerate(linha):
            if c == "1":
                b.ponto(28 + i, 48 + j, GELO[5] if (i in (3, 4) or j in (3, 4)) else GELO[4])


if __name__ == "__main__":
    b.desenhar()
    armadura()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz de gelo cobre as orelhas
    capuz()
    coroa()
    lascas()
    b.conferencia("browgelo")
