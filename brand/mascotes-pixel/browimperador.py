"""Browimperador (lendário, linha 4, coluna 0): o imperador. Uma coroa imperial de ouro bem alta, de cinco pontas com as
pérolas e a ametista grande no meio; o elmo de ouro em volta do rosto com os arabescos gravados, o rosto à mostra numa
abertura de cantos arredondados; a aura de labaredas de ouro por trás; o uniforme azul-imperial com as dragonas de ouro
com franjas, a faixa vermelha em diagonal, a gola de ouro e a estrela de ouro no peito.  python browimperador.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
OURO_CLARO = [(200, 130, 20), (240, 180, 40), (255, 214, 80), (255, 236, 140), (255, 248, 200), (255, 255, 240)]
AURA = [(120, 50, 6), (200, 100, 14), (240, 150, 30), (255, 196, 60), (255, 226, 120), (255, 246, 190)]
AZUL = [(8, 10, 34), (16, 22, 66), (28, 38, 104), (44, 58, 144), (68, 86, 184), (104, 124, 220)]
VERMELHO = [(64, 6, 14), (120, 14, 26), (176, 28, 38), (214, 50, 50), (238, 90, 84), (252, 140, 124)]
AMETISTA = [(60, 10, 100), (110, 30, 170), (170, 80, 230), (230, 180, 255)]
PEROLA = [(170, 160, 180), (230, 226, 240), (255, 255, 255)]
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


def chama(cx, base, alt, larg, balanco=0.0):
    t = (base - b.py) / alt
    meia = larg * np.clip(1 - t, 0, 1) ** 0.75 * np.clip(0.55 + t * 2.2, 0, 1)
    eixo = cx + balanco * np.clip(t, 0, 1) ** 2
    d = np.abs(b.px - eixo) - meia
    return np.maximum(d, np.maximum(-t * alt, (t - 1) * alt))


def aura():
    """as labaredas de ouro por trás, espelhadas, em três camadas (âmbar por fora, ouro e o miolo quase branco)"""
    lista = [(22.0, 20.0, 30.0, 10.0, -5.0), (13.0, 30.0, 30.0, 9.5, -7.0), (7.0, 44.0, 25.0, 8.0, -6.0),
             (6.0, 58.0, 18.0, 6.5, -4.0)]
    for rampa, escala in ((AURA, 1.0), (OURO_CLARO, 0.62), (PEROLA + PEROLA, 0.3)):
        d = np.full(b.img.shape[:2], 99.0)
        for cx, base, alt, larg, bal in lista:
            for lado in (1, -1):
                x = MEIO + lado * (cx - MEIO)
                d = np.minimum(d, chama(x, base, alt * (0.35 + 0.65 * escala), larg * escala, bal * lado))
        b.peca("aura", d, rampa, 2.0, cortes=CORTES, linha=AURA[0] if rampa is AURA else None)


def elmo():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("elmo", d, OURO, 4.0, cortes=CORTES, linha=OURO[0])
    # os arabescos gravados dos lados: volutas espelhadas
    for x, y in ((11, 22), (12, 21), (13, 21), (13, 22), (12, 23), (11, 26), (11, 27), (12, 28), (13, 28),
                 (11, 34), (12, 35), (13, 35), (13, 34), (12, 38), (11, 39)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, OURO[1])
    b.clarear(m & (abertura <= 1.6), OURO)
    b.pintar(m & (abertura > 0) & (abertura <= 0.8), OURO[1])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def coroa():
    """a coroa imperial: o aro largo e cinco pontas altas com as pérolas, e a ametista grande no meio"""
    pontas = [(16.5, -3.13, 3.6), (24.0, -7.13, 3.8), (MEIO, -11.13, 4.4), (40.0, -7.13, 3.8), (47.5, -3.13, 3.6)]
    d = b.caixa(14, 3, 49, 12, 2)
    for cx, topo, larg in pontas:
        d = np.minimum(d, poligono([(cx - larg, 5.0), (cx, topo), (cx + larg, 5.0)]))
    m, _ = b.peca("coroa", d, OURO, 2.0, cortes=CORTES, linha=OURO[0])
    for cx, topo, larg in pontas:   # o fio de luz em cada ponta
        b.pintar(m & (np.abs(b.px - cx) < 0.6) & (b.py < 4) & (b.py > topo + 1), OURO[5])
    for x in range(14, 50):
        b.ponto(x, 4, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 11, OURO[1])
    for cx, topo, _ in pontas:   # as pérolas nas pontas
        b.peca("perola", b.bola(cx, topo - 0.4, 1.5), PEROLA + PEROLA, 1.0, cortes=(0.3, 0.5, 0.7, 0.9, 1.0), linha=PEROLA[0])
    for x in (18, 24):   # as pérolas pequenas no aro, espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, 7, PEROLA[2]); b.ponto(xx, 8, PEROLA[1])
    b.peca("gema", b.bola(MEIO, 7.5, 3.0, 2.6), AMETISTA + AMETISTA[-2:], 1.4, cortes=(0.3, 0.5, 0.7, 0.9, 1.0),
           linha=OURO[0])
    b.ponto(31, 6, AMETISTA[3])


def uniforme():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, AZUL, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a faixa vermelha em diagonal, do ombro dele até o quadril, com a beira de ouro
    s = (b.py - 43.0) - (b.px - 20.0) * 0.8
    faixa = corpo & (np.abs(s) < 2.2)
    b.vestir("corpo", d_corpo, VERMELHO, 4.0, onde=faixa)
    b.pintar(corpo & (np.abs(s - 2.2) < 0.5), OURO[3])
    b.pintar(corpo & (np.abs(s + 2.2) < 0.5), OURO[4])
    # os botões de ouro em duas fileiras, espelhados
    for y in (50, 54, 58):
        for xx in (27, 36):
            if not faixa[y + b.OY, xx + b.OX]:
                b.ponto(xx, y, OURO[4])
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, OURO, None, livre)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), AZUL, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, OURO)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), AZUL, 2.5)
    # as dragonas de ouro nos ombros, com as franjas caindo (espelhadas: x0 + x1 = 63)
    for x0, x1 in ((9, 20), (43, 54)):
        b.peca("dragona", b.caixa(x0, 43, x1, 46, 2), OURO, 1.2, cortes=CORTES, linha=OURO[0])
        for x in range(x0 + 1, x1, 2):
            b.ponto(x, 47, OURO[3]); b.ponto(x, 48, OURO[2])
    # a gola alta de ouro
    for x in range(22, 42):
        b.ponto(x, 45, OURO[4] if x < 32 else OURO[3])


def estrela_do_peito():
    """a estrela de ouro no peito, centralizada, com o miolo vermelho"""
    forma = ["00011000", "00111100", "11111111", "01111110", "00111100", "01100110"]
    for j, linha in enumerate(forma):
        for i, c in enumerate(linha):
            if c == "1":
                b.ponto(28 + i, 48 + j, OURO[5] if (i < 4 and j < 3) else OURO[3])
    b.ponto(31, 50, VERMELHO[3]); b.ponto(32, 50, VERMELHO[2])


if __name__ == "__main__":
    b.desenhar(atras=aura)
    uniforme()
    estrela_do_peito()
    b.img[b.peca_de == "orelha", 3] = 0   # o elmo cobre as orelhas
    elmo()
    coroa()
    b.conferencia("browimperador")
