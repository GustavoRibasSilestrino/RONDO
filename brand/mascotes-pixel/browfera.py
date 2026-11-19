"""Browfera (raro, linha 2, coluna 10): a fera. Capuz de pelo roxo felpudo com a juba de tufos pontudos em cima, os dois
chifres de marfim curvando para fora e a marca de estrela de ouro na testa, o rosto à mostra numa abertura de cantos
arredondados; macacão de pelo roxo com a barriga lilás, as garras brancas nas mãos e nos pés e o colar de couro com os
três dentes de fera, o do meio de ouro.  python browfera.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ROXO = [(30, 8, 60), (60, 20, 116), (94, 40, 176), (128, 66, 220), (164, 104, 244), (206, 156, 255)]
LILAS = [(90, 60, 150), (140, 110, 200), (186, 160, 236), (214, 196, 250), (234, 222, 255), (248, 242, 255)]
MARFIM = [(120, 100, 70), (176, 156, 116), (220, 204, 164), (240, 230, 200), (250, 246, 228), (255, 255, 248)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
COURO = [(50, 26, 14), (90, 50, 26)]
ROSA = (240, 130, 180)
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
        for t in np.linspace(0, 1, 10):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def felpudo(d, amp=0.5):
    """a beira de pelo, espelhada em volta do meio"""
    return d + amp * np.sin(np.abs(b.px - MEIO) * 1.9) * np.cos(b.py * 1.7)


def chifres():
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        d = tubo([(x(15.0), 9.0, 3.0), (x(10.0), 2.0, 2.4), (x(8.0), -4.0, 1.7), (x(10.0), -8.0, 1.0)])
        m, _ = b.peca("chifre", d, MARFIM, 1.6, cortes=CORTES, linha=MARFIM[0])
        for y in (5, 1, -3):   # os anéis do chifre
            b.escurecer(m & (b.yy == y), MARFIM)


def juba():
    """os tufos pontudos de pelo em cima do capuz, espelhados, os do meio mais altos"""
    for dx, alt, larg in ((19.0, 9.13, 4.2), (12.5, 13.13, 4.6), (6.0, 15.13, 4.6)):
        for lado in (-1, 1):
            cx = MEIO + lado * dx
            ponta = cx + lado * (3.0 + dx * 0.15)
            d = poligono([(cx - larg, 10.0), (ponta, 10.0 - alt), (cx + larg, 10.0)])
            b.peca("capuz", d, ROXO, 1.8, cortes=CORTES, linha=ROXO[0])
    d = poligono([(MEIO - 4.6, 10.0), (MEIO, -8.13), (MEIO + 4.6, 10.0)])
    b.peca("capuz", d, ROXO, 1.8, cortes=CORTES, linha=ROXO[0])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(felpudo(b.caixa(8, 5, 55, 44, 11)), -abertura)
    m, _ = b.peca("capuz", d, ROXO, 4.0, cortes=CORTES, linha=ROXO[0])
    # os fios de pelo: riscos curtos claros e escuros, espelhados
    for x, y in ((12, 12), (11, 20), (12, 30), (13, 38), (18, 9), (24, 8)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, ROXO[4]); b.ponto(xx, y + 1, ROXO[1])
    # a marca de estrela de ouro na testa
    estrela = ["001100", "011110", "111111", "011110", "010010"]
    for j, linha in enumerate(estrela):
        for i, c in enumerate(linha):
            if c == "1":
                b.ponto(29 + i, 11 + j, OURO[4] if i < 3 else OURO[2])
    b.clarear(m & (abertura <= 1.6), ROXO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ROXO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.vestir("corpo", felpudo(b.bola(MEIO, 56.0, 6.5, 5.0), 0.6), LILAS, 3.0, onde=corpo)   # a barriga
    for x, y in ((19, 50), (22, 57), (20, 46)):   # os fios de pelo, espelhados
        for xx in (x, 63 - x):
            b.ponto(xx, y, ROXO[4]); b.ponto(xx, y + 1, ROXO[1])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ROXO, 3.0)
        b.ponto(int(cx), 53, ROSA)
        for dx in (-2, 0, 2):   # as garras
            b.ponto(int(cx) + dx, 56, MARFIM[5]); b.ponto(int(cx) + dx, 55, MARFIM[3])
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ROXO, 2.5)
        for x in (x0 + 1, x0 + 3, x0 + 5):
            b.ponto(x, 67, MARFIM[5])


def colar():
    """o colar de couro em V com os três dentes de fera, o do meio de ouro, por cima de tudo"""
    for k in range(7):
        y = 45 + k // 2
        for x in (25 + k, 38 - k):
            b.ponto(x, y, COURO[1]); b.ponto(x, y + 1, COURO[0])
    for x0 in (27, 35):   # os dentes de marfim dos lados, pontudos para baixo
        for k, larg in enumerate((2, 2, 1)):
            xs = range(x0, x0 + larg) if x0 < 32 else range(x0 + 2 - larg, x0 + 2)
            for x in xs:
                b.ponto(x, 48 + k, MARFIM[5] if x < 32 else MARFIM[3])
    for k, meia in enumerate((2, 2, 1, 1)):   # o dente de ouro do meio, maior
        for x in range(32 - meia, 32 + meia):
            b.ponto(x, 49 + k, OURO[4] if x < 32 else OURO[2])
    b.ponto(31, 53, OURO[3]); b.ponto(32, 53, OURO[1])

if __name__ == "__main__":
    b.desenhar()
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    chifres()
    juba()
    capuz()
    colar()
    b.conferencia("browfera")
