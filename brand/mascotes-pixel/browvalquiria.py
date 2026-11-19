"""Browvalquíria (épica, linha 3, coluna 3): a valquíria. Elmo de ouro com a crista no meio, as pedras (rubi no meio,
safiras dos lados) e as asinhas de penas brancas abrindo dos dois lados, o rosto à mostra numa abertura de cantos
arredondados; peitoral de ouro com o rubi, saiote de placas vermelhas, a capa vermelha por trás e a lança de ponta
de prata na mão.  python browvalquiria.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
PENA = [(120, 116, 160), (170, 166, 206), (214, 212, 236), (236, 234, 250), (248, 247, 255), (255, 255, 255)]
VERMELHO = [(64, 6, 20), (120, 14, 36), (172, 28, 52), (210, 50, 70), (236, 92, 104), (250, 140, 150)]
PRATA = [(60, 66, 90), (110, 118, 146), (160, 168, 194), (204, 210, 230), (232, 236, 248), (255, 255, 255)]
MADEIRA = [(40, 20, 10), (78, 42, 20), (118, 70, 36), (156, 100, 56)]
RUBI = [(110, 0, 50), (200, 20, 100), (250, 90, 170), (255, 200, 230)]
SAFIRA = [(10, 40, 120), (30, 110, 220), (130, 200, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def capa():
    d = b.caixa(12, 40, 51, 65, 4)
    b.peca("capa", d, VERMELHO, 3.0, cortes=CORTES, linha=VERMELHO[0])
    for x in (14, 49):
        for y in range(46, 64):
            b.ponto(x, y, VERMELHO[1])


def asinhas():
    """as asinhas de penas brancas nos dois lados do elmo, abrindo para cima e para fora"""
    for lado in (-1, 1):
        rx = MEIO + lado * 21.5
        for ang, comp, larg in ((25, 15, 2.6), (50, 17, 2.8), (75, 14, 2.6)):
            a = ang if lado > 0 else 180 - ang
            cx, cy, dx, dy = b.pena(rx, 22.0, a, comp, larg, PENA, PENA[1])
            for t in np.linspace(-0.1, 0.35, 4):
                b.ponto(int(round(cx + dx * comp * t)), int(round(cy + dy * comp * t)), PENA[5])


def elmo():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(9, 5, 54, 42, 11), -abertura)
    m, _ = b.peca("elmo", d, OURO, 4.0, cortes=CORTES, linha=OURO[0])
    # a crista no meio, de cima até a testa
    crista = b.caixa(29, 0, 34, 15, 2)
    b.peca("elmo", crista, OURO, 1.6, cortes=CORTES, linha=OURO[0])
    for y in range(1, 15):
        b.ponto(31, y, OURO[5]); b.ponto(32, y, OURO[3])
    # a faixa das pedras na testa: rubi no meio, safiras espelhadas
    for x in range(14, 50):
        if m[15 + b.OY, x + b.OX]:
            b.ponto(x, 15, OURO[1])
    b.peca("rubi", b.bola(MEIO, 16.0, 2.3, 2.0), RUBI, 1.0, cortes=(0.3, 0.55, 0.8, 0.95, 1.0), linha=RUBI[0])
    b.ponto(31, 15, RUBI[3])
    for claro, escuro in ((23, 24), (40, 39)):   # espelhadas: o lado de fora de cada pedra é o claro
        b.ponto(claro, 15, SAFIRA[2]); b.ponto(claro, 16, SAFIRA[1])
        b.ponto(escuro, 15, SAFIRA[1]); b.ponto(escuro, 16, SAFIRA[0])
    # os rebites dos lados, espelhados
    for x, y in ((12, 24), (12, 33)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, OURO[5]); b.ponto(xx, y + 1, OURO[1])
    b.clarear(m & (abertura <= 1.6), OURO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def armadura():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, OURO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # o saiote de placas vermelhas embaixo, com as divisões
    saiote = corpo & (b.yy >= 55)
    b.vestir("corpo", d_corpo, VERMELHO, 4.0, onde=saiote)
    for x in (21, 26, 37, 42):
        for y in range(56, 63):
            if corpo[y + b.OY, x + b.OX]:
                b.ponto(x, y, VERMELHO[1])
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 54, OURO, None, livre)
    # o peitoral: as duas placas arredondadas e o rubi no meio
    for cx in (25.5, 38.5):
        borda = np.abs(b.bola(cx, 48.0, 5.0, 4.0)) < 0.6
        b.pintar(borda & corpo & (b.py < 51), OURO[1])
    b.peca("rubi", b.bola(MEIO, 49.0, 2.0, 2.2), RUBI, 1.0, cortes=(0.3, 0.55, 0.8, 0.95, 1.0), linha=OURO[0])
    b.ponto(31, 48, RUBI[3])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), OURO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, VERMELHO)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), OURO, 2.5)


def lanca():
    """a lança na mão direita: o cabo de madeira, a fita vermelha e a ponta de prata"""
    for y in range(32, 66):
        b.ponto(53, y, MADEIRA[0]); b.ponto(56, y, MADEIRA[0])
        b.ponto(54, y, MADEIRA[3] if y % 4 == 0 else MADEIRA[2]); b.ponto(55, y, MADEIRA[1])
    d = np.maximum(np.abs(b.px - 55.0) - 2.8 * np.clip((b.py - 20.0) / 6.0, 0, 1),
                   np.maximum(20.0 - b.py, b.py - 32.0))
    b.peca("lanca", d, PRATA, 1.4, cortes=CORTES, linha=PRATA[0])
    for y in range(23, 31):
        b.ponto(55, y, PRATA[5])
    for x, y in ((52, 33), (51, 34), (51, 35), (57, 33), (58, 34)):   # a fitinha vermelha
        b.ponto(x, y, VERMELHO[3])


if __name__ == "__main__":
    b.desenhar(atras=capa)
    armadura()
    b.img[b.peca_de == "orelha", 3] = 0   # o elmo cobre as orelhas
    elmo()
    asinhas()
    lanca()
    b.conferencia("browvalquiria")
