"""Browrei (raro, linha 2, coluna 0): o rei. Coroa de ouro de cinco pontas com pérolas nas pontas, o veludo vermelho por
dentro e as pedras no aro (o rubi no meio); manto vermelho real com a gola de arminho branco e as pintinhas pretas, a
capa por trás com a beira de arminho, o medalhão de ouro no peito e o cetro com a esfera na mão.  python browrei.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
VERMELHO = [(64, 6, 16), (116, 14, 30), (168, 24, 40), (206, 44, 54), (234, 84, 84), (250, 130, 120)]
ARMINHO = [(130, 126, 146), (184, 180, 200), (222, 220, 234), (240, 238, 248), (250, 249, 254), (255, 255, 255)]
PRETO = (20, 18, 26)
RUBI = [(110, 0, 50), (200, 20, 100), (250, 90, 170), (255, 200, 230)]
SAFIRA = [(10, 40, 120), (30, 110, 220), (130, 200, 255)]
ESMERALDA = [(6, 70, 40), (20, 160, 90), (140, 240, 180)]
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


def pedra(x, y, rampa, larga=False):
    """uma pedra lapidada pequena: 2x2 (ou 2x3 se larga), clara em cima à esquerda"""
    xs = (x, x + 1) if not larga else (x - 1, x, x + 1, x + 2)
    for xx in xs:
        b.ponto(xx, y, rampa[1]); b.ponto(xx, y + 1, rampa[0] if xx > x else rampa[1])
    b.ponto(x, y, rampa[2])


def capa():
    """a capa vermelha por trás, aparecendo dos lados, com a beira de arminho"""
    d = b.caixa(10, 40, 53, 66, 4)
    m, _ = b.peca("capa", d, VERMELHO, 3.0, cortes=CORTES, linha=VERMELHO[0])
    beira = m & (d > -2.2) & ((b.px < 16) | (b.px > 48))
    b.pintar(beira, ARMINHO[3])
    b.pintar(beira & (b.px < MEIO), ARMINHO[4])
    for x, y in ((11, 46), (11, 53), (11, 60)):   # as pintinhas do arminho, espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, y, PRETO)


def coroa():
    # o veludo vermelho por dentro, aparecendo entre as pontas
    b.peca("coroa", b.bola(MEIO, 4.0, 12.0, 6.5), VERMELHO, 3.0, cortes=CORTES, linha=VERMELHO[0])
    # o aro e as cinco pontas, espelhados em volta do meio
    aro = b.caixa(18, 5, 46, 12, 1)
    pontas = [(19.0, -4.0, 3.2), (25.5, -1.0, 3.0), (MEIO, -7.0, 3.6), (38.5, -1.0, 3.0), (45.0, -4.0, 3.2)]
    d = aro
    for cx, topo, larg in pontas:
        d = np.minimum(d, poligono([(cx - larg, 7.0), (cx, topo), (cx + larg, 7.0)]))
    m, _ = b.peca("coroa", d, OURO, 2.0, cortes=CORTES, linha=OURO[0])
    # a beira de cima e de baixo do aro, com a luz e a sombra
    for x in range(18, 46):
        b.ponto(x, 6, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 11, OURO[1])
    # as pérolas nas pontas
    for cx, topo, _ in pontas:
        b.peca("perola", b.bola(cx, topo - 0.5, 1.6), ARMINHO, 1.0, cortes=CORTES, linha=ARMINHO[0])
    # as pedras no aro: o rubi grande no meio, safiras e esmeraldas espelhadas
    b.peca("rubi", b.bola(MEIO, 8.5, 2.2, 2.0), RUBI, 1.0, cortes=(0.3, 0.55, 0.8, 0.95, 1.0), linha=RUBI[0])
    b.ponto(31, 8, RUBI[3])
    for x, rampa in ((21, SAFIRA), (26, ESMERALDA)):
        for xx in (x, 63 - x - 1):
            pedra(xx, 8, rampa)
    # a sombra da coroa na calda
    sombra = (b.yy == 13) & (b.xx >= 18) & (b.xx <= 45) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def manto():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, VERMELHO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a abertura do manto no meio, com a beira de ouro
    for y in range(47, 62):
        b.ponto(31, y, OURO[4]); b.ponto(32, y, OURO[2])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), VERMELHO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, ARMINHO)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, ARMINHO, None, livre)
    # a gola de arminho, fofa, dando a volta embaixo da cabeça
    gola = b.felpudo(np.maximum(b.bola(MEIO, 43.0, 17.0, 5.0), -b.bola(MEIO, 39.0, 9.0, 4.0)), 0.5)
    g, _ = b.peca("gola", gola, ARMINHO, 2.0, cortes=CORTES, linha=ARMINHO[0])
    for x, y in ((19, 43), (24, 46), (29, 45)):   # as pintinhas pretas, espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, y, PRETO)
            b.ponto(xx, y + 1, PRETO)
    # o medalhão de ouro no peito
    b.peca("medalha", b.bola(MEIO, 52.0, 3.4), OURO, 2.0, cortes=CORTES, linha=OURO[0])
    b.peca("rubi", b.bola(MEIO, 52.0, 1.5), RUBI, 1.0, cortes=(0.3, 0.55, 0.8, 0.95, 1.0), linha=RUBI[0])
    b.ponto(31, 51, RUBI[3])


def cetro():
    """o cetro de ouro na mão esquerda, com a esfera e a cruzinha em cima"""
    for y in range(44, 62):
        b.ponto(9, y, OURO[4]); b.ponto(10, y, OURO[2])
    for y in (47, 56):   # os anéis do cabo
        b.ponto(8, y, OURO[1]); b.ponto(9, y, OURO[3]); b.ponto(10, y, OURO[3]); b.ponto(11, y, OURO[1])
    b.peca("cetro", b.bola(10.0, 41.5, 3.0), OURO, 1.6, cortes=CORTES, linha=OURO[0])
    b.ponto(9, 41, RUBI[2]); b.ponto(10, 41, RUBI[1]); b.ponto(9, 40, RUBI[3])
    for y in (36, 37, 38):
        b.ponto(9, y, OURO[4]); b.ponto(10, y, OURO[2])
    b.ponto(8, 37, OURO[3]); b.ponto(11, 37, OURO[1])


if __name__ == "__main__":
    b.desenhar(atras=capa)
    manto()
    with b.deslocado(b.CABECA_DESCE):
        coroa()
    cetro()
    b.conferencia("browrei")
