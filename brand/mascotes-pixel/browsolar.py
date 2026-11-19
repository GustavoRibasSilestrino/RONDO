"""Browsolar (lendário, linha 4, coluna 2): o deus-sol. O disco do sol vermelho-alaranjado entre os dois chifres de ouro
curvos no alto da cabeça, com a pedra de lápis-lazúli no meio do diadema; o resplendor de raios de sol em volta de tudo,
alternando compridos e curtos; o colar largo de contas de ouro, laranja e lápis; a túnica de linho branco com a faixa
de ouro e o símbolo da vida (ankh) de ouro na mão.  python browsolar.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
SOL = [(130, 20, 6), (200, 50, 14), (240, 96, 24), (252, 146, 40), (255, 196, 80), (255, 236, 160)]
RAIO = [(170, 80, 6), (230, 140, 20), (252, 190, 50), (255, 224, 110), (255, 244, 180), (255, 255, 230)]
LAPIS = [(10, 16, 70), (20, 36, 130), (36, 64, 180), (60, 96, 214), (100, 140, 238), (160, 190, 252)]
LINHO = [(150, 140, 120), (200, 192, 172), (230, 224, 206), (244, 240, 228), (250, 248, 240), (255, 255, 250)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 12):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def resplendor():
    """os raios de sol em volta de tudo, saindo do centro da cabeça: compridos e curtos alternando, espelhados"""
    cx, cy = MEIO, 26.0
    ang = np.degrees(np.arctan2(np.abs(b.px - cx), cy - b.py))   # 0 em cima, espelhado em volta do meio
    r = np.hypot(b.px - cx, b.py - cy)
    setor = np.floor(ang / 15.0)
    fase = (ang / 15.0) - setor                                   # 0 a 1 dentro do setor
    comprido = (setor % 2 == 0)
    alcance = np.where(comprido, 38.0, 32.0)
    meia = np.abs(fase - 0.5) * 2                                 # 0 no meio do raio, 1 na beira
    raio = (r > 18) & (r < alcance - meia * 9.0) & (ang < 150)
    m = raio
    b.contorno(m, "raio", RAIO[0])
    b.pintar(m, RAIO[2])
    b.pintar(m & (meia < 0.45), RAIO[3])
    b.pintar(m & (meia < 0.2), RAIO[4])
    b.peca_de[m] = "raio"


def coroa_do_sol():
    """os chifres de ouro curvos e o disco do sol entre eles, em cima do diadema de ouro com a pedra de lápis"""
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        d = tubo([(x(26.0), 10.0, 2.0), (x(20.0), 5.0, 1.8), (x(17.0), -2.0, 1.6), (x(18.0), -8.0, 1.3), (x(21.0), -11.0, 1.0)])
        b.peca("chifre", d, OURO, 1.6, cortes=CORTES, linha=OURO[0])
    disco = b.bola(MEIO, -1.0, 8.0)
    m, _ = b.peca("sol", disco, SOL, 3.0, cortes=CORTES, linha=SOL[0])
    for x, y in ((28, -5), (29, -6), (30, -6), (27, -4)):   # o brilho do disco
        b.ponto(x, y, SOL[5])
    # o diadema de ouro na testa, com a pedra de lápis no meio
    for x in range(14, 50):
        b.ponto(x, 9, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 10, OURO[2] if x < 32 else OURO[1])
        b.ponto(x, 11, OURO[0])
    b.peca("pedra", b.bola(MEIO, 10.0, 2.2, 2.0), LAPIS + LAPIS[-2:], 1.0, cortes=(0.3, 0.5, 0.7, 0.9, 1.0), linha=OURO[0])
    b.ponto(31, 9, LAPIS[5])


def tunica():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, LINHO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for x in (22, 27):   # as pregas do linho, espelhadas
        for xx in (x, 63 - x):
            for y in range(53, 62):
                b.ponto(xx, y, LINHO[2])
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 53, OURO, None, livre)
    for cx in (14.5, 49.5):
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 50, OURO)
    # o colar largo de contas: quatro fileiras (ouro, laranja, lápis, ouro), mais baixas no meio
    for x in range(18, 46):
        yb = 44 + int(round(2.0 * (1 - ((x + 0.5 - MEIO) / 14.0) ** 2)))
        for k, cor in enumerate((OURO, SOL, LAPIS, OURO)):
            conta = (x + k) % 2 == 0
            b.ponto(x, yb + k, cor[4] if conta else cor[2])
        b.ponto(x, yb + 4, OURO[0])


def ankh():
    """o ankh (o símbolo da vida) de ouro na mão esquerda dele, à direita da tela"""
    forma = [".###.", "#...#", "#...#", ".#.#.", "#####", "..#..", "..#..", "..#..", "..#..", "..#.."]
    m = np.zeros(b.img.shape[:2], bool)
    for j, linha in enumerate(forma):
        for i, c in enumerate(linha):
            if c == "#":
                m[46 + j + b.OY, 53 + i + b.OX] = True
    b.contorno(m, "ankh", OURO[0])
    for j, linha in enumerate(forma):
        for i, c in enumerate(linha):
            if c == "#":
                b.ponto(53 + i, 46 + j, OURO[4] if i < 3 else OURO[3])
    b.ponto(54, 47, OURO[5])


if __name__ == "__main__":
    b.desenhar(atras=resplendor)
    tunica()
    with b.deslocado(b.CABECA_DESCE):
        coroa_do_sol()
    ankh()
    b.conferencia("browsolar")
