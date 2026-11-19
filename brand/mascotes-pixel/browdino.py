"""Browdino (incomum, linha 1, coluna 13): fantasia de dinossauro. Capuz verde com os olhões do dino e as narinas em cima,
a crista de espinhos amarelos e laranja no alto e o rosto à mostra numa abertura de cantos arredondados; macacão verde
com manchinhas, a barriga amarela listrada, as garrinhas brancas nas mãos e nos pés e o rabo com espinhos saindo por
trás.  python browdino.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

VERDE = [(12, 56, 16), (26, 104, 26), (48, 156, 36), (90, 200, 50), (150, 232, 90), (210, 252, 160)]
AMARELO = [(140, 80, 0), (210, 140, 10), (246, 196, 30), (255, 226, 80), (255, 244, 150), (255, 252, 210)]
LARANJA = [(110, 40, 6), (190, 80, 14), (236, 124, 30), (252, 166, 60), (255, 204, 110), (255, 232, 170)]
BRANCO = [(150, 150, 140), (200, 200, 190), (236, 236, 228), (250, 250, 244), (255, 255, 252), (255, 255, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def poligono(pontos):
    """distância com sinal (aproximada) de um polígono convexo, com os pontos em sentido horário na tela"""
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


def espinho(cx, base, alt, larg, rampa):
    """um espinho triangular arredondado, com a face da esquerda clara e a da direita escura"""
    m = poligono([(cx - larg, base), (cx, base - alt), (cx + larg, base)]) <= 0
    b.contorno(m, "espinho", rampa[0])
    b.pintar(m, rampa[2])
    b.pintar(m & (b.px < cx), rampa[3])
    b.pintar(m & (b.px < cx - larg * 0.4) & (b.py > base - alt * 0.6), rampa[4])
    b.pintar(m & (b.px > cx + larg * 0.5), rampa[1])


def rabo():
    """o rabo grosso saindo de trás do corpo pela direita, afinando para cima, com espinhos em cima"""
    caminho = [(44, 60, 4.0), (51, 60, 3.4), (56, 57, 2.6), (59, 53, 1.8), (60, 50, 1.2)]
    m, _ = b.peca("rabo", tubo(caminho), VERDE, 1.8, cortes=CORTES, linha=VERDE[0])
    for x, y in ((50, 58), (54, 57)):
        b.ponto(x, y, VERDE[1])
    for cx, base in ((52.5, 57.0), (56.5, 54.0)):
        espinho(cx, base, 3.0, 1.6, AMARELO)


def crista():
    """os espinhos no alto do capuz: o do meio mais alto, espelhados, alternando amarelo e laranja"""
    for dx, alt, larg, rampa in ((12.0, 6.0, 2.8, LARANJA), (6.0, 8.5, 3.2, AMARELO)):
        for cx in (MEIO - dx, MEIO + dx):
            espinho(cx, 7.0, alt, larg, rampa)
    espinho(MEIO, 7.0, 11.0, 3.8, LARANJA)


def capuz():
    abertura = b.caixa(16, 21, 47, 40, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, VERDE, 4.0, cortes=CORTES, linha=VERDE[0])
    for x, y in ((12, 10), (13, 9), (14, 9), (11, 12)):   # brilho do tecido
        b.ponto(x, y, VERDE[5])
    for x, y in ((11, 26), (13, 36), (10, 31), (14, 30)):   # manchinhas espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, y, VERDE[1])
    # os olhões do dino em cima do capuz, espelhados, com um brilho só cada
    for cx in (21.5, 42.5):
        b.peca("olho_dino", b.bola(cx, 12.5, 3.2, 3.0), BRANCO, 1.2, cortes=CORTES, linha=VERDE[0])
        b.peca("olho_dino", b.bola(cx, 13.0, 1.8, 2.0), b.OLHO, 1.0, linha=b.OLHO[0])
    b.ponto(21, 12, BRANCO[5]); b.ponto(42, 12, BRANCO[5])
    # as narinas, espelhadas, no meio
    for x in (28, 35):
        b.ponto(x, 17, VERDE[0]); b.ponto(x + (1 if x < 32 else -1), 17, VERDE[1])
    b.clarear(m & (abertura <= 1.6), VERDE)
    # os dentinhos brancos na beira de cima da abertura (a boca do dino), espelhados
    for x in (20, 24, 28):
        for xx in (x, 63 - x):
            b.ponto(xx, 21, BRANCO[4]); b.ponto(xx, 22, BRANCO[2])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, VERDE, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a barriga amarela com as listras
    barriga = b.vestir("corpo", b.bola(MEIO, 53.5, 6.5, 7.0), AMARELO, 3.0, onde=corpo)
    for y in (51, 55):
        b.escurecer(barriga & (b.yy == y), AMARELO)
    for x, y in ((19, 47), (21, 56), (18, 52)):   # manchinhas espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, y, VERDE[1])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), VERDE, 3.0)
        for dx in (-2, 0, 2):   # as garrinhas
            b.ponto(int(cx) + dx, 55, BRANCO[4])
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), VERDE, 2.5)
        for x in (x0 + 1, x0 + 3, x0 + 5):
            b.ponto(x, 66, BRANCO[4])


if __name__ == "__main__":
    b.desenhar(atras=rabo)
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas de bolo ficam dentro do capuz
    capuz()
    crista()
    b.conferencia("browdino")
