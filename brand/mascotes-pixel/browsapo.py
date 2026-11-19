"""Browsapo (comum, linha 0, coluna 11): fantasia de sapo. Capuz verde liso e brilhante com os dois olhões de sapo
saltados no alto e pintinhas, e o rosto à mostra numa abertura de cantos arredondados; macacão verde com a barriga
amarelo-clara, pintinhas e as pontas dos dedos redondinhas.  python browsapo.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

VERDE = [(12, 46, 20), (24, 84, 30), (40, 124, 42), (66, 164, 56), (110, 200, 80), (176, 236, 136)]
VENTRE = [(110, 120, 40), (164, 176, 70), (206, 216, 110), (230, 236, 150), (244, 248, 190), (255, 255, 226)]
OLHO_BRANCO = [(150, 160, 170), (210, 216, 222), (244, 246, 248), (255, 255, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def pintas(mascara, pontos):
    """pintinhas verde-escuras (2x2 com um pixel mais claro em cima, como uma bolinha)"""
    for x, y in pontos:
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            yy, xx = y + dy + b.OY, x + dx + b.OX
            if mascara[yy, xx]:
                b.ponto(x + dx, y + dy, VERDE[1] if dy else VERDE[2])


def olhos_de_sapo():
    for cx in (19.0, 44.0):   # espelhados em volta de x = 31.5
        b.peca("capuz", b.bola(cx, 3.5, 6.2, 5.8), VERDE, 3.0, cortes=CORTES, linha=VERDE[0])
        globo = b.bola(cx, 3.8, 4.2, 3.9)
        b.peca("capuz", globo, OLHO_BRANCO, 2.0, cortes=(0.4, 0.62, 0.8), linha=VERDE[1])
        # a pupila preta, horizontal, olhando para a frente, com um brilho
        for dx in (-2, -1, 0, 1):
            b.ponto(int(cx) + dx, 4, b.OLHO[0])
            b.ponto(int(cx) + dx, 5, b.OLHO[0])
        b.ponto(int(cx) - 1, 3, b.OLHO[0]); b.ponto(int(cx), 3, b.OLHO[0])
        b.ponto(int(cx) - 2, 3, b.BRANCO)
        # a pálpebra verde por cima do olho
        palp = (b.bola(cx, 3.8, 4.6, 4.3) <= 0) & (b.py < 1.2)
        b.pintar(palp, VERDE[3])
        b.pintar(palp & (b.py < 0.2), VERDE[4])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, VERDE, 4.0, cortes=CORTES, linha=VERDE[0])
    # brilho de pele lisa no alto à esquerda
    for x, y in ((13, 9), (14, 8), (15, 8), (16, 8), (13, 10)):
        b.ponto(x, y, VERDE[5])
    pintas(m, [(24, 9), (38, 8), (11, 22), (51, 25), (12, 33), (50, 36), (31, 12), (20, 14), (43, 14)])
    # a beira da abertura, um tom mais clara (o capuz é grosso), e a sombra no rosto
    b.clarear(m & (abertura <= 1.6), VERDE)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, VERDE, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a barriga amarelo-clara
    b.vestir("corpo", b.bola(31.5, 53.5, 10.0, 7.5), VENTRE, 3.0, onde=corpo)
    pintas(corpo & (b.bola(31.5, 53.5, 10.5, 8.0) > 0), [(18, 47), (44, 50), (19, 57), (43, 58)])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), VERDE, 3.0)
        # as pontas dos dedos de sapo: três bolinhas claras embaixo da mão
        for dx in (-2, 0, 2):
            b.ponto(int(cx) + dx, 55, VERDE[4])
    for x0 in (21, 35):
        m = b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), VERDE, 2.5)
        for dx in (1, 3, 5):
            b.ponto(x0 + dx, 67, VERDE[4])


if __name__ == "__main__":
    b.desenhar()
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas de bolo ficam dentro do capuz
    capuz()
    olhos_de_sapo()
    b.conferencia("browsapo")
