"""Browpiloto (comum, linha 0, coluna 4): o comandante de avião. Quepe azul-marinho de copa redonda com o emblema de asas
de ouro e o galão dourado na pala; paletó azul-marinho com a gola da camisa branca, gravata, botões de ouro, o broche
de asas no peito e as listras de comandante nos punhos.  python browpiloto.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

AZUL = [(8, 12, 34), (16, 24, 62), (26, 38, 96), (38, 56, 132), (60, 84, 172), (108, 136, 214)]
PRETO = [(6, 6, 10), (16, 16, 24), (30, 30, 42), (52, 52, 68), (96, 96, 116), (190, 190, 210)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
CAMISA = [(150, 150, 172), (196, 198, 214), (236, 238, 246), (255, 255, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
BRANCO = (255, 255, 244)


def asas_de_ouro(cx, cy, larg):
    """o emblema de aviador, espelhado certinho: um medalhão de 2 pixels no meio (cx é a divisa entre eles, ex.: 31.5)
    e três penas de cada lado, cada vez mais curtas, com as mesmas cores dos dois lados"""
    esq, dir_ = int(cx - 0.5), int(cx + 0.5)          # os dois pixels do meio
    cores = (OURO[4], OURO[3], OURO[2])
    for i, comp in enumerate((larg, larg - 2, larg - 4)):
        y = cy - 1 + i
        for k in range(1, comp + 1):
            b.ponto(esq - k, y, cores[i])
            b.ponto(dir_ + k, y, cores[i])
        b.ponto(esq - comp - 1, y, OURO[1])
        b.ponto(dir_ + comp + 1, y, OURO[1])
    for dy, c in ((-1, OURO[5]), (0, OURO[4]), (1, OURO[2]), (2, OURO[1])):
        b.ponto(esq, cy + dy, c)
        b.ponto(dir_, cy + dy, c)


def quepe():
    # a copa: redonda e alta, um pouco mais larga que o aro, entre as orelhas
    b.peca("quepe", b.bola(31.5, 4.0, 14.5, 7.0), AZUL, 3.2, cortes=CORTES, linha=AZUL[1])
    for x in range(22, 30):   # luz no alto da copa
        b.ponto(x, -1, AZUL[5])
    # o aro, mais escuro, com o cordão dourado
    b.peca("quepe", b.caixa(19, 6, 44, 14, 2), [AZUL[0], AZUL[1], AZUL[1], AZUL[2], AZUL[3], AZUL[4]], 2.0,
           cortes=CORTES, linha=AZUL[0])
    for x in range(20, 44):
        b.ponto(x, 12, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 13, OURO[1])
    # o emblema de asas de ouro na frente
    asas_de_ouro(31.5, 9, 7)
    # a pala preta envernizada com o galão dourado ("ovos mexidos") em zigue-zague na beira
    pala = np.maximum(b.bola(31.5, 14.5, 13.5, 3.6), 14.5 - b.py)
    b.peca("quepe", pala, PRETO, 1.6, cortes=CORTES, linha=PRETO[0])
    for x in range(21, 43):
        b.ponto(x, 15 + (x % 2), OURO[3] if x < 32 else OURO[2])
    for x in range(23, 28):
        b.ponto(x, 16 + (x % 2 == 0), PRETO[4])
    # sombra da pala na testa
    sombra = (b.yy >= 18) & (b.yy <= 19) & (b.xx >= 19) & (b.xx <= 44) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def uniforme():
    # o paletó: o corpo vira tecido azul-marinho liso, com a luz e a sombra da forma
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, AZUL, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a sombra da cabeça no alto do paletó
    b.escurecer(corpo & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), AZUL)
    # as mangas até o punho; a mão continua de bolo
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), AZUL, 3.0, onde=b.yy <= 51)
    # punhos com as listras de comandante (ouro com filete azul)
    for cx in (14.5, 49.5):
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 50, OURO, (AZUL[3], AZUL[1]))
    # a gola da camisa branca em V e a gravata
    for y in range(42, 49):
        meia = 7 - (y - 42)
        for x in range(32 - meia, 32 + meia):
            if abs(x + 0.5 - 32) > meia - 2.5:   # as duas abas da gola
                b.ponto(x, y, CAMISA[3] if x < 32 else CAMISA[2])
            else:
                b.ponto(x, y, CAMISA[1])
        b.ponto(32 - meia - 1, y, AZUL[0]); b.ponto(32 + meia, y, AZUL[0])
    for y in range(43, 54):   # a gravata
        larg = 1 if y < 45 else 2
        for x in range(32 - larg, 32 + larg):
            b.ponto(x, y, PRETO[3] if x < 32 else PRETO[2])
    b.ponto(31, 53, PRETO[1]); b.ponto(32, 53, PRETO[1]); b.ponto(31, 54, PRETO[1])
    b.ponto(31, 43, PRETO[4])
    # lapelas: um vinco escuro descendo da gola
    for i in range(6):
        b.ponto(24 + i // 2, 48 + i, AZUL[1])
        b.ponto(39 - i // 2, 48 + i, AZUL[1])
    # botões de ouro
    for y in (52, 57):
        for x in (27, 36):
            b.ponto(x, y, OURO[4]); b.ponto(x + 1, y, OURO[2]); b.ponto(x, y + 1, OURO[1]); b.ponto(x + 1, y + 1, OURO[0])
    # o broche de asas no peito
    asas_de_ouro(21.5, 46, 3)


if __name__ == "__main__":
    b.desenhar()
    uniforme()
    quepe()
    b.conferencia("browpiloto")
