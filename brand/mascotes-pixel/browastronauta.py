"""Browastronauta (raro, linha 2, coluna 2): o astronauta. Capacete roxo com o visor de vidro (o rosto e os olhos à mostra,
só os reflexos nos cantos), os dois discos de rádio dos lados, as luzinhas laranja em cima e a antena; traje espacial
roxo com remendos laranja, o cinto com fivela, os tanques de oxigênio aparecendo atrás e
a medalha de estrela de ouro na correntinha.  python browastronauta.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ROXO = [(34, 10, 70), (66, 24, 120), (104, 44, 170), (144, 72, 210), (184, 116, 238), (226, 176, 255)]
LARANJA = [(120, 40, 6), (196, 80, 16), (240, 124, 34), (252, 168, 66), (255, 206, 120), (255, 236, 186)]
CINZA = [(50, 50, 70), (90, 92, 116), (140, 142, 166), (186, 188, 208), (222, 224, 238), (250, 250, 255)]
VIDRO = [(150, 230, 255), (210, 248, 255), (255, 255, 255)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
VERDE, VERMELHO, AZUL = (80, 230, 120), (250, 70, 70), (80, 170, 255)
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def tanques():
    """os dois tanques de oxigênio da mochila, aparecendo por trás dos ombros, espelhados"""
    for x0 in (11, 47):   # x0 + x1 = 63 nos dois
        d = b.caixa(x0, 38, x0 + 5, 60, 2)
        b.peca("tanque", d, CINZA, 2.0, cortes=CORTES, linha=CINZA[0])
        for y in (42, 56):
            for x in range(x0, x0 + 6):
                b.ponto(x, y, LARANJA[2] if x < x0 + 3 else LARANJA[1])


def capacete():
    abertura = b.caixa(15, 18, 48, 40, 6)
    casco = b.caixa(8, 4, 55, 45, 13)
    d = np.maximum(casco, -abertura)
    m, _ = b.peca("capacete", d, ROXO, 4.5, cortes=CORTES, linha=ROXO[0])
    # a beira do visor: um aro mais claro em volta da abertura
    aro = m & (abertura <= 2.0)
    b.pintar(aro, ROXO[4])
    b.pintar(aro & (b.py > 30), ROXO[3])
    b.pintar(aro & (abertura <= 0.8), ROXO[1])
    # o brilho do casco e as luzinhas laranja em cima, espelhadas
    for x, y in ((14, 9), (15, 8), (16, 7), (13, 10), (17, 7)):
        b.ponto(x, y, ROXO[5])
    for x in (25, 29):
        for xx in (x, 63 - x):
            b.ponto(xx, 8, LARANJA[3]); b.ponto(xx, 9, LARANJA[1])
    # os discos de rádio dos lados, espelhados
    for cx in (8.5, 55.5):
        b.peca("disco", b.bola(cx, 29.0, 3.6, 5.0), ROXO, 2.0, cortes=CORTES, linha=ROXO[0])
        b.peca("disco", b.bola(cx, 29.0, 1.8, 2.8), CINZA, 1.2, cortes=CORTES, linha=CINZA[1])
    # o vidro: transparente, só os reflexos nos cantos (nunca em cima dos olhos)
    vidro = (abertura <= 0)
    # o vidro tem um azul bem clarinho, quase transparente, por cima do rosto
    tinta = vidro & (b.img[..., 3] > 0)
    azul = np.array((170, 220, 255), float)
    b.img[tinta, :3] = np.round(b.img[tinta, :3] * 0.8 + azul * 0.2).astype(b.img.dtype)
    for x, y, c in ((17, 21, 2), (18, 20, 2), (19, 20, 1), (20, 20, 0), (17, 22, 1), (17, 23, 0), (17, 24, 0), (21, 20, 1), (23, 20, 0),
                    (46, 35, 1), (46, 36, 0), (45, 37, 0)):
        if vidro[y + b.OY, x + b.OX]:
            b.ponto(x, y, VIDRO[c])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def antena():
    for y in range(-3, 4):
        b.ponto(31, y, CINZA[4]); b.ponto(32, y, CINZA[2])
    b.peca("antena", b.bola(MEIO, -4.5, 2.2), LARANJA, 1.2, cortes=(0.3, 0.5, 0.7, 0.9, 1.0), linha=LARANJA[0])
    b.ponto(31, -5, LARANJA[5])
    for x, y in ((28, -5), (35, -5), (31, -8), (32, -8)):   # o brilho da luz, espelhado
        b.ponto(x, y, LARANJA[4])


def traje():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ROXO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ROXO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, LARANJA)
    for x0 in (21, 35):
        m = b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ROXO, 2.5)
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), CINZA, 2.5, onde=b.yy >= 64)   # as botas
    # os remendos laranja, espelhados
    for x0, y0 in ((19, 50), (22, 55)):
        for x, y in ((x0, y0), (x0 + 1, y0), (x0, y0 + 1), (x0 + 1, y0 + 1)):
            for xx in (x, 63 - x):
                b.ponto(xx, y, LARANJA[3] if (y == y0) else LARANJA[1])
    # o cinto cinza com a fivela
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 58, CINZA, None, livre)


def medalha():
    """a correntinha de ouro logo abaixo do capacete e a estrela de ouro, centralizada"""
    for k in range(3):
        x, y = 29 + k, 45 + k
        b.ponto(x, y, OURO[4] if k % 2 else OURO[2]); b.ponto(63 - x, y, OURO[4] if k % 2 else OURO[2])
    estrela = ["00011000", "00111100", "11111111", "01111110", "00111100", "01100110"]
    for j, linha in enumerate(estrela):
        for i, c in enumerate(linha):
            if c == "1":
                cor = OURO[4] if i < 4 else OURO[2]
                if j >= 4:
                    cor = OURO[3] if i < 4 else OURO[1]
                b.ponto(28 + i, 48 + j, cor)
    b.ponto(30, 50, OURO[5])

if __name__ == "__main__":
    b.desenhar(atras=tanques)
    traje()
    b.img[b.peca_de == "orelha", 3] = 0   # o capacete cobre as orelhas
    antena()
    capacete()
    medalha()
    b.conferencia("browastronauta")
