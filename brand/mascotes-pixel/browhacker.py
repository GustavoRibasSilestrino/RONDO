"""Browhacker (épico, linha 3, coluna 1): o hacker. Moletom de capuz roxo-escuro com orelhinhas de beira neon verde e o
LED vermelho no meio, as trilhas de circuito verdes acesas e o fone de neon dos lados; o rosto à mostra numa abertura
de cantos arredondados; os cordões neon do capuz, o notebook aberto na frente com o código verde na tela e os zeros e
uns flutuando em volta.  python browhacker.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ROXO = [(10, 6, 24), (22, 14, 48), (36, 26, 74), (54, 42, 104), (78, 64, 138), (112, 96, 176)]
NEON = [(10, 70, 30), (20, 150, 60), (50, 220, 90), (130, 255, 150), (210, 255, 220), (240, 255, 244)]
VERMELHO = [(120, 10, 20), (230, 40, 50), (255, 140, 140)]
CINZA = [(30, 32, 44), (60, 64, 80), (100, 106, 124), (150, 156, 174), (196, 200, 214), (236, 238, 246)]
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


def trilha(pontos, mascara):
    """uma trilha de circuito: segmentos retos acesos, com a bolinha na ponta; espelhada"""
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i // max(n, 1)
            y = y0 + (y1 - y0) * i // max(n, 1)
            for xx in (x, 63 - x):
                if mascara[y + b.OY, xx + b.OX]:
                    b.ponto(xx, y, NEON[2])
    xf, yf = pontos[-1]
    for xx in (xf, 63 - xf):
        b.ponto(xx, yf, NEON[4])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if mascara[yf + dy + b.OY, xx + dx + b.OX]:
                b.ponto(xx + dx, yf + dy, NEON[1])


def orelhas():
    for cx in (15.0, 49.0):
        m, _ = b.peca("capuz", b.bola(cx, 5.0, 5.4), ROXO, 2.2, cortes=CORTES, linha=NEON[1])
        anel = m & (b.bola(cx, 5.0, 5.4) > -1.2)
        b.pintar(anel, NEON[2])
        b.pintar(anel & (b.py < 4), NEON[3])
        led = b.bola(cx, 5.5, 1.5) <= 0
        b.pintar(led, VERMELHO[1])
        b.ponto(int(cx) - 1, 5, VERMELHO[2])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, ROXO, 4.0, cortes=CORTES, linha=ROXO[0])
    # a costura do meio do capuz, de cima até a abertura
    for y in range(6, 18):
        b.ponto(31, y, ROXO[4]); b.ponto(32, y, ROXO[1])
    # as trilhas de circuito acesas, espelhadas
    trilha([(20, 8), (20, 12), (24, 12), (24, 15)], m)
    trilha([(11, 18), (13, 18), (13, 26)], m)
    trilha([(10, 33), (13, 33), (13, 38)], m)
    b.clarear(m & (abertura <= 1.6), ROXO)
    # a beira da abertura acesa de leve
    beira = m & (abertura > 0) & (abertura <= 0.9)
    b.pintar(beira, NEON[1])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # o fone de neon dos dois lados (um hexágono aceso)
    for lado in (-1, 1):
        cx = MEIO + lado * 25.5
        hexa = poligono([(cx - 2.6, 25.0), (cx + 2.6, 25.0), (cx + 4.0, 29.0), (cx + 2.6, 33.0), (cx - 2.6, 33.0),
                         (cx - 4.0, 29.0)])
        hm = hexa <= 0
        b.contorno(hm, "fone", NEON[0])
        b.pintar(hm, NEON[2])
        b.pintar(hm & (hexa > -1.2), NEON[3])
        b.pintar(hm & (b.bola(cx, 29.0, 1.6) <= 0), NEON[1])


def moletom():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ROXO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    trilha([(19, 45), (19, 49), (22, 49)], corpo)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ROXO, 3.0)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, NEON)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ROXO, 2.5)
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), NEON[:4] + [NEON[3]] * 2, 2.5, onde=b.yy >= 65)   # o tênis neon
    # os cordões neon do capuz, com a ponteira
    for x in (28, 35):
        for y in range(45, 51):
            b.ponto(x, y, NEON[2] if y % 2 else NEON[3])
        b.ponto(x, 51, CINZA[4]); b.ponto(x, 52, CINZA[2])


def notebook():
    """o notebook aberto na frente da barriga: a tampa com a tela de código verde e a base cinza"""
    tela = b.caixa(23, 50, 40, 59, 1) <= 0
    b.contorno(tela, "notebook", CINZA[0])
    b.pintar(tela, CINZA[2])
    dentro = b.caixa(25, 52, 38, 58, 0) <= 0
    b.pintar(dentro, (8, 20, 14))
    for y, xs in ((53, range(26, 32)), (54, range(28, 36)), (55, range(26, 30)), (56, range(29, 37)), (57, range(26, 33))):
        for x in xs:
            if (x * 7 + y) % 5:
                b.ponto(x, y, NEON[2] if (x + y) % 3 else NEON[3])
    for x in range(22, 42):   # a base do teclado
        b.ponto(x, 60, CINZA[4] if x < 32 else CINZA[3])
        b.ponto(x, 61, CINZA[1])
    b.ponto(31, 51, NEON[4]); b.ponto(32, 51, NEON[4])   # a webcam acesa


def codigo():
    """zeros e uns flutuando em volta, nas mesmas posições dos dois lados (os algarismos não espelham)"""
    um = ["01", "11", "01", "01", "11"]
    zero = ["111", "101", "101", "101", "111"]
    for forma, x0, y0 in ((um, -2, 14), (zero, 1, 40), (um, 4, 2)):
        for j, linha in enumerate(forma):
            for i, c in enumerate(linha):
                if c == "1":
                    b.ponto(x0 + i, y0 + j, NEON[2])
                    b.ponto(63 - x0 - len(linha) + 1 + i, y0 + j, NEON[2])   # do outro lado sem espelhar o algarismo


if __name__ == "__main__":
    b.desenhar()
    moletom()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    orelhas()
    capuz()
    notebook()
    codigo()
    b.conferencia("browhacker")
