"""Browgamer (comum, linha 0, coluna 12): o gamer. Boné branco com a aba azul e um coração de pixel; headset preto com
luz RGB ciano nas conchas e o microfone curvado até a boca; moletom magenta com cordões, bolso canguru e um controle de
videogame estampado.  python browgamer.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

MAGENTA = [(54, 8, 46), (100, 18, 84), (150, 30, 124), (196, 50, 160), (228, 90, 196), (248, 150, 226)]
BRANCO = [(110, 116, 140), (168, 174, 196), (214, 218, 234), (238, 240, 248), (250, 251, 255), (255, 255, 255)]
AZUL = [(10, 24, 60), (20, 44, 104), (32, 70, 152), (52, 104, 200), (90, 146, 236), (150, 196, 252)]
PRETO = [(6, 6, 10), (16, 16, 24), (30, 30, 42), (52, 52, 68), (96, 96, 116), (190, 190, 210)]
CIANO = [(16, 110, 140), (40, 196, 220), (150, 250, 255), (232, 255, 255)]
CINZA = [(60, 62, 76), (110, 114, 132), (160, 164, 182), (206, 210, 224)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def bone():
    # a copa branca cobrindo o alto da cabeça, com os gomos costurados
    copa = np.maximum(b.bola(31.5, 13.0, 21.5, 10.5), b.py - 15)
    m, _ = b.peca("bone", copa, BRANCO, 3.0, cortes=CORTES, linha=BRANCO[0])
    for x0 in (22, 41):   # as costuras dos gomos, descendo em curva
        for y in range(4, 15):
            x = int(round(x0 + (x0 - 31.5) * (y - 4) * 0.035))
            if m[y + b.OY, x + b.OX]:
                b.ponto(x, y, BRANCO[2])
    b.ponto(31, 2, BRANCO[1]); b.ponto(32, 2, BRANCO[1])   # o botãozinho do alto
    # o coração de pixel magenta na frente
    coracao = ["01100110", "11111111", "11111111", "01111110", "00111100", "00011000"]   # centrado em x = 31.5
    for j, linha in enumerate(coracao):
        for i, c in enumerate(linha):
            if c == "1":
                cor = MAGENTA[5] if (i, j) in ((1, 1), (2, 1), (1, 2)) else MAGENTA[3] if i < 4 else MAGENTA[2]
                b.ponto(28 + i, 6 + j, cor)
    # a aba azul para a frente, curvada
    aba = np.maximum(b.bola(31.5, 15.0, 17.5, 3.6), 15.0 - b.py)
    am, _ = b.peca("bone", aba, AZUL, 1.6, cortes=CORTES, linha=AZUL[0])
    for x in range(20, 30):
        b.ponto(x, 16, AZUL[5] if 22 <= x <= 25 else AZUL[4])
    # sombra da aba na testa
    sombra = (b.yy >= 19) & (b.yy <= 20) & (b.peca_de == "cabeca") & (np.abs(b.px - 31.5) < 18)
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def headset():
    # o arco preto por cima do boné
    arco = np.maximum(np.maximum(b.bola(31.5, 24, 24.0, 23.0), -b.bola(31.5, 24, 21.8, 20.8)), b.py - 22)
    b.peca("headset", arco, PRETO, 1.2, cortes=CORTES, linha=PRETO[0])
    # as conchas, espelhadas, com o anel de luz ciano
    for x0, x1, luz in ((4, 12, 8), (51, 59, 55)):
        b.peca("headset", b.caixa(x0, 17, x1, 32, 4), PRETO, 2.0, cortes=CORTES, linha=PRETO[0])
        anel = (np.abs(b.bola(luz + 0.5, 24.5, 3.2, 5.0)) <= 0.7)
        b.pintar(anel, CIANO[1])
        b.pintar(anel & (b.py < 23), CIANO[2])
        b.ponto(luz, 20, CIANO[3])
    # o microfone: uma haste que sai da concha esquerda e curva até perto da boca
    caminho = [(9, 31), (9, 32), (10, 33), (11, 34), (12, 35), (13, 35), (14, 36), (15, 36), (16, 37), (17, 37), (18, 37)]
    for x, y in caminho:
        b.ponto(x, y - 1, PRETO[0]); b.ponto(x, y, PRETO[4]); b.ponto(x, y + 1, PRETO[0])
    m = b.bola(20.0, 37.5, 1.8, 1.6) <= 0
    b.contorno(m, "headset", PRETO[0])
    b.pintar(m, PRETO[2])
    b.ponto(19, 37, CIANO[2])


def moletom():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, MAGENTA, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.escurecer(corpo & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), MAGENTA)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), MAGENTA, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, MAGENTA)
    # os cordões do capuz, com as ponteiras
    for x in (28, 35):
        for y in range(42, 49):
            b.ponto(x, y, BRANCO[4] if x < 32 else BRANCO[3])
        b.ponto(x, 49, CINZA[1]); b.ponto(x, 50, CINZA[0])
    # o bolso canguru: a beira de cima em arco e os lados
    for x in range(23, 41):
        b.ponto(x, 53, MAGENTA[1])
    for y in range(53, 61):
        b.ponto(22, y, MAGENTA[1]); b.ponto(41, y, MAGENTA[1])
    # o controle de videogame estampado no bolso
    controle = b.caixa(26, 55, 37, 59, 2)
    cm = controle <= 0
    b.contorno(cm, "estampa", PRETO[0])
    b.pintar(cm, CINZA[2])
    b.pintar(cm & (b.yy == 59), CINZA[1])
    for x, y in ((28, 56), (27, 57), (28, 57), (29, 57), (28, 58)):   # o direcional
        b.ponto(x, y, PRETO[1])
    b.ponto(35, 56, (230, 60, 60)); b.ponto(34, 57, (60, 200, 90)); b.ponto(36, 57, (70, 130, 240))
    b.ponto(35, 58, (250, 210, 60))


if __name__ == "__main__":
    b.desenhar()
    moletom()
    bone()
    b.img[b.peca_de == "orelha", 3] = 0   # o boné e o headset cobrem as orelhas
    headset()
    b.conferencia("browgamer")
