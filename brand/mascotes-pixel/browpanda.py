"""Browpanda (raro, linha 2, coluna 13): fantasia de panda. Capuz branco com as orelhas redondas pretas e a carinha do
panda em cima (as manchas pretas dos olhos com o brilho e o focinho), o rosto à mostra numa abertura de cantos
arredondados; macacão branco com os braços e as pernas pretos, os botões vermelhos, as almofadinhas e um galho de bambu
com folhas na mão.  python browpanda.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

BRANCO = [(120, 120, 150), (176, 176, 200), (220, 220, 236), (240, 240, 248), (250, 250, 254), (255, 255, 255)]
PRETO = [(8, 8, 18), (20, 20, 38), (34, 34, 60), (52, 52, 86), (78, 78, 120), (120, 120, 168)]
VERMELHO = [(90, 8, 14), (170, 24, 30), (226, 52, 48), (250, 110, 96)]
BAMBU = [(30, 70, 20), (60, 120, 30), (100, 170, 50), (150, 210, 80), (200, 240, 140)]
ROSA = (230, 140, 170)
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def orelhas():
    for cx in (14.0, 50.0):   # espelhadas em volta de 32
        b.peca("capuz", b.bola(cx, 4.0, 5.8), PRETO, 2.2, cortes=CORTES, linha=PRETO[0])


def capuz():
    abertura = b.caixa(16, 21, 47, 40, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, BRANCO, 4.0, cortes=CORTES, linha=BRANCO[0])
    # a carinha do panda no alto do capuz: as manchas dos olhos inclinadas, espelhadas, com o olhinho e o brilho
    for lado in (-1, 1):
        cx = MEIO + lado * 6.5
        a = np.radians(30 * lado)
        u = (b.px - cx) * np.cos(a) + (b.py - 13.5) * np.sin(a)
        v = -(b.px - cx) * np.sin(a) + (b.py - 13.5) * np.cos(a)
        mancha = (np.hypot(u / 4.2, v / 3.0) <= 1) & m
        b.pintar(mancha, PRETO[1])
        b.pintar(mancha & (b.py < 12.0), PRETO[3])
    for x in (26, 37):   # os olhinhos com o brilho
        b.ponto(x, 13, BRANCO[5]); b.ponto(x, 14, BRANCO[3])
    # o focinho
    for x in (30, 31, 32, 33):
        b.ponto(x, 17, PRETO[1])
    b.ponto(31, 18, PRETO[1]); b.ponto(32, 18, PRETO[1]); b.ponto(31, 17, PRETO[4])
    b.clarear(m & (abertura <= 1.6), BRANCO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, BRANCO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), PRETO, 3.0)
        b.ponto(int(cx), 54, ROSA); b.ponto(int(cx) - 1, 53, ROSA); b.ponto(int(cx) + 1, 53, ROSA)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), PRETO, 2.5)
        for x in (x0 + 2, x0 + 3, x0 + 4, x0 + 5):
            b.ponto(x, 65, ROSA)
    # os botões vermelhos no meio
    for y in (48, 55):
        b.peca("botao", b.bola(MEIO, y + 0.5, 1.7), VERMELHO + VERMELHO[-2:], 1.0, linha=VERMELHO[0])
        b.ponto(31, y, VERMELHO[3])


def bambu():
    """o galho de bambu na mão esquerda, com os nós e as folhas"""
    for y in range(36, 62):
        b.ponto(9, y, BAMBU[0]); b.ponto(12, y, BAMBU[0])
        b.ponto(10, y, BAMBU[3]); b.ponto(11, y, BAMBU[2])
    for y in (41, 48, 55):   # os nós
        for x in range(9, 13):
            b.ponto(x, y, BAMBU[1])
        b.ponto(10, y - 1, BAMBU[4])
    for x, y, c in ((13, 40, 3), (14, 39, 3), (15, 38, 2), (16, 38, 2), (14, 40, 2),   # as folhas
                    (8, 46, 3), (7, 45, 3), (6, 44, 2), (5, 44, 2), (7, 46, 2),
                    (13, 47, 3), (14, 46, 2), (15, 46, 2)):
        b.ponto(x, y, BAMBU[c])
    b.peca("braco", b.bola(13.0, 51.5, 2.4, 2.0), PRETO, 1.2, cortes=CORTES, linha=PRETO[0])   # a mão por cima


if __name__ == "__main__":
    b.desenhar()
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas de bolo ficam dentro do capuz
    orelhas()
    capuz()
    bambu()
    b.conferencia("browpanda")
