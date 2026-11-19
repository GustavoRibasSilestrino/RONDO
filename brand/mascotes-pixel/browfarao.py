"""Browfaraó (raro, linha 2, coluna 8): o faraó. Toucado redondo (nemes) com as listras de ouro e lápis-lazúli abrindo em
leque a partir do rosto, a tiara de ouro com a pedra azul na testa; o
rosto à mostra numa abertura de cantos arredondados; colar largo de contas, túnica azul com o cajado de pastor na mão,
pulseiras de ouro e o escaravelho na fivela do cinto.  python browfarao.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
LAPIS = [(10, 16, 70), (20, 36, 130), (36, 64, 180), (60, 96, 214), (100, 140, 238), (160, 190, 252)]
TURQUESA = [(10, 90, 100), (30, 170, 170), (120, 230, 220)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def toucado():
    abertura = b.caixa(16, 19, 47, 39, 5)
    casco = b.caixa(7, 4, 56, 44, 13)
    d = np.maximum(casco, -abertura)
    m, _ = b.peca("toucado", d, OURO, 4.0, cortes=CORTES, linha=OURO[0])
    # as listras: em leque saindo do rosto no alto, retas (horizontais) nas abas, sempre espelhadas
    ang = np.degrees(np.arctan2(np.abs(b.px - MEIO), 30.0 - b.py))
    leque = (np.floor(ang / 11.0) % 2 == 1)
    azul = m & leque
    b.trocar(azul, OURO, LAPIS)
    # a tiara de ouro na beira de cima da abertura, com a pedra azul no meio
    for x in range(17, 47):
        b.ponto(x, 17, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 18, OURO[2] if x < 32 else OURO[1])
    for xx in (31, 32):
        b.ponto(xx, 15, LAPIS[3]); b.ponto(xx, 16, LAPIS[2]); b.ponto(xx, 17, LAPIS[2]); b.ponto(xx, 18, LAPIS[1])
    b.ponto(30, 16, OURO[4]); b.ponto(33, 16, OURO[2]); b.ponto(30, 17, OURO[3]); b.ponto(33, 17, OURO[1])
    b.ponto(31, 15, LAPIS[5])
    b.clarear(m & (abertura <= 1.4) & (b.py > 19), OURO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def tunica():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, LAPIS, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 50, OURO)   # as pulseiras de ouro
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, OURO, None, livre)
    # o colar largo de contas: três fileiras (ouro, turquesa, ouro) logo abaixo do toucado, mais baixas no meio
    for x in range(18, 46):
        yb = 45 + int(round(2.0 * (1 - ((x + 0.5 - MEIO) / 14.0) ** 2)))
        claro = x < 32
        for k, cor in enumerate((OURO, TURQUESA, OURO, LAPIS)):
            conta = (x + k) % 2 == 0
            b.ponto(x, yb + k, cor[2] if conta and claro else (cor[1] if not conta else cor[1]))
            if conta and cor is OURO:
                b.ponto(x, yb + k, cor[4])
        b.ponto(x, yb + 4, OURO[0])    # o escaravelho pequeno na fivela do cinto: o corpo azul e as asinhas de ouro, espelhadas
    for x, y in ((27, 59), (28, 59), (28, 60), (29, 60)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, OURO[4] if x < 32 else OURO[3])
    for xx in (30, 31, 32, 33):
        b.ponto(xx, 59, LAPIS[3] if xx < 32 else LAPIS[2]); b.ponto(xx, 60, LAPIS[2] if xx < 32 else LAPIS[1])
    b.ponto(31, 58, LAPIS[4]); b.ponto(32, 58, LAPIS[2])

def cajado():
    """o cajado de pastor na mão esquerda: o cabo listrado passa por dentro da mão (os dedinhos fecham por cima) e o
    gancho em cima vira para fora"""
    mao = (b.peca_de == "braco") & (b.img[..., 3] > 0) & (b.bola(14.5, 50, 4.2, 5.6) <= 0)
    guardado = b.img.copy()
    for y in range(37, 63):
        c = OURO if (y // 2) % 2 else LAPIS
        b.ponto(12, y, OURO[0]); b.ponto(15, y, OURO[0])
        b.ponto(13, y, c[4]); b.ponto(14, y, c[2])
    # o gancho
    for x, y in ((13, 36), (12, 35), (11, 34), (10, 34), (9, 34), (8, 35), (8, 36), (8, 37)):
        b.ponto(x, y, OURO[4])
    for x, y in ((14, 36), (13, 35), (12, 34), (11, 33), (10, 33), (9, 33), (8, 34), (7, 35), (7, 36), (7, 37),
                 (7, 38), (8, 38), (9, 37), (9, 36), (10, 35), (11, 35), (12, 36)):
        b.ponto(x, y, OURO[0])
    # os dedos fecham por cima do cabo: a parte de baixo da mão volta para a frente
    dedos = mao & (b.py > 51.0) & (b.py < 55.0)
    b.img[dedos] = guardado[dedos]
    linha = dedos & ~np.roll(dedos, 1, 0)
    b.escurecer(linha & (b.px > 12) & (b.px < 16), b.BROWNIE)

if __name__ == "__main__":
    b.desenhar()
    tunica()
    b.img[b.peca_de == "orelha", 3] = 0   # o toucado cobre as orelhas
    toucado()
    cajado()
    b.conferencia("browfarao")
