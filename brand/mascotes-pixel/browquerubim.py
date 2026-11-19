"""Browquerubim (raro, linha 2, coluna 1): o querubim. Capuz branco de nuvem com o rosto à mostra numa abertura de cantos
arredondados e as orelhas de brownie saindo por dois furinhos; coroinha de prata de três pontas com o coração rosa no
meio; asinhas de penas brancas por trás; túnica branca com a fita lilás de beira dourada, o laço e o broche de
coração.  python browquerubim.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

BRANCO = [(120, 112, 160), (176, 170, 210), (220, 216, 240), (240, 238, 250), (250, 249, 255), (255, 255, 255)]
PENA = [(120, 116, 160), (170, 166, 206), (214, 212, 236), (236, 234, 250), (248, 247, 255), (255, 255, 255)]
PRATA = [(70, 72, 100), (120, 124, 156), (170, 174, 204), (210, 214, 236), (236, 238, 250), (255, 255, 255)]
LILAS = [(70, 36, 110), (110, 66, 170), (150, 104, 210), (184, 146, 236), (214, 190, 250), (240, 226, 255)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
ROSA = [(130, 20, 70), (210, 50, 120), (250, 110, 170), (255, 200, 225)]
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


def coracao(x0, y0, rampa):
    """um coraçãozinho de 6x5 com o canto x0, y0, espelhado em volta do meio dele"""
    forma = ["110011", "111111", "111111", "011110", "001100"]
    for j, linha in enumerate(forma):
        for i, c in enumerate(linha):
            if c == "1":
                cor = rampa[1]
                if j <= 1 and i in (1, 4):
                    cor = rampa[3] if i == 1 else rampa[2]
                elif j >= 3:
                    cor = rampa[0] if j == 4 else rampa[1]
                elif i < 3:
                    cor = rampa[2]
                b.ponto(x0 + i, y0 + j, cor)


def asas():
    b.asas_de_penas(PENA, centro=MEIO, escala=0.92)


def capuz():
    orelha = (b.peca_de == "orelha") & (b.img[..., 3] > 0)
    guardado = b.img.copy()
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11) + 0.4 * np.sin(np.abs(b.px - MEIO) * 1.9) * np.cos(b.py * 1.7), -abertura)
    m, _ = b.peca("capuz", d, BRANCO, 4.0, cortes=CORTES, linha=BRANCO[0])
    b.tufos(m & (abertura > 2.5), BRANCO, 3, 0.05)
    # as orelhas de brownie saem por dois furinhos no capuz: a beira do furo um pouco mais escura
    b.img[orelha] = guardado[orelha]
    b.peca_de[orelha] = "orelha"
    beira = m & ~orelha & (np.roll(orelha, 1, 0) | np.roll(orelha, -1, 0) | np.roll(orelha, 1, 1) | np.roll(orelha, -1, 1))
    b.pintar(beira, BRANCO[1])
    b.clarear(m & (abertura <= 1.6), BRANCO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def coroa():
    """a coroinha de prata de três pontas, com bolinhas nas pontas e o coração rosa no meio"""
    pontas = [(24.5, -4.0, 3.0), (MEIO, -8.0, 3.6), (39.5, -4.0, 3.0)]
    d = b.caixa(21, 2, 42, 8, 1)
    for cx, topo, larg in pontas:
        d = np.minimum(d, poligono([(cx - larg, 3.0), (cx, topo), (cx + larg, 3.0)]))
    b.peca("coroa", d, PRATA, 1.6, cortes=CORTES, linha=PRATA[0])
    for x in range(21, 43):
        b.ponto(x, 3, PRATA[5] if x < 32 else PRATA[4])
        b.ponto(x, 7, PRATA[1])
    for cx, topo, _ in pontas:
        b.peca("perola", b.bola(cx, topo - 0.6, 1.4), ROSA[1:] + [ROSA[3]] * 3, 1.0, linha=ROSA[0])
    coracao(29, 3, ROSA)


def tunica():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, BRANCO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # as dobrinhas da túnica, espelhadas
    for x in (22, 27):
        for xx in (x, 63 - x):
            for y in range(53, 61):
                b.ponto(xx, y, BRANCO[2])
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    # a fita lilás dando a volta na cintura, com o filete de ouro embaixo
    b.faixa_envolvente(d_corpo <= 0, 50, LILAS, (OURO[4], OURO[2]), livre)
    # o laço da fita no meio, com as pontas caindo
    for lado in (-1, 1):
        cx = MEIO + lado * 3.4
        b.peca("laco", b.bola(cx, 51.0, 3.0, 2.2), LILAS, 1.2, cortes=CORTES, linha=LILAS[0])
        for k in range(4):   # as pontas da fita caindo, espelhadas
            x = int(MEIO + lado * (1.5 + k * 0.5)) - (1 if lado < 0 else 0)
            b.ponto(x, 54 + k, LILAS[3] if lado < 0 else LILAS[2])
    coracao(29, 49, ROSA)   # o broche de coração no nó


if __name__ == "__main__":
    b.desenhar(atras=asas)
    tunica()
    capuz()
    coroa()
    b.conferencia("browquerubim")
