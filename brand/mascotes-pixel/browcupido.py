"""Browcupido (épico, linha 3, coluna 4): o cupido. Coroa de ouro com o coração de rubi no meio; asas de penas cor-de-rosa
abertas por trás; toga branca presa no ombro, com a faixa rosa em diagonal e a borda de ouro, o broche de coração no
peito; o arco de ouro com a flecha de ponta de coração na mão e coraçõezinhos flutuando em volta.  python browcupido.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
ASA = [(150, 60, 110), (210, 110, 160), (240, 160, 196), (252, 196, 220), (255, 222, 236), (255, 244, 250)]
BRANCO = [(130, 120, 150), (184, 176, 200), (222, 218, 236), (240, 238, 248), (250, 249, 254), (255, 255, 255)]
ROSA = [(130, 20, 70), (200, 50, 110), (240, 100, 150), (255, 160, 196), (255, 206, 226), (255, 236, 244)]
RUBI = [(110, 0, 40), (200, 20, 80), (250, 90, 150), (255, 200, 225)]
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


def coracao(x0, y0, rampa, contorno=None):
    """um coraçãozinho de 6x5 com o canto em x0, y0, simétrico nele mesmo, com o contorno em volta se pedido"""
    forma = ["110011", "111111", "111111", "011110", "001100"]
    m = np.zeros(b.img.shape[:2], bool)
    for j, linha in enumerate(forma):
        for i, c in enumerate(linha):
            if c == "1":
                m[y0 + j + b._dy + b.OY, x0 + i + b.OX] = True
    if contorno:
        b.contorno(m, "coracao", contorno)
    for j, linha in enumerate(forma):
        for i, c in enumerate(linha):
            if c == "1":
                cor = rampa[2] if i < 3 else rampa[1]
                if j == 0 and i in (0, 4):
                    cor = rampa[3]
                b.ponto(x0 + i, y0 + j, cor)

def asas():
    b.asas_de_penas(ASA, centro=MEIO, escala=0.95)


def coroa():
    pontas = [(19.5, -3.0, 3.0), (25.5, -1.0, 2.6), (MEIO, -5.0, 3.4), (38.5, -1.0, 2.6), (44.5, -3.0, 3.0)]
    d = b.caixa(17, 5, 46, 11, 1)
    for cx, topo, larg in pontas:
        d = np.minimum(d, poligono([(cx - larg, 6.0), (cx, topo), (cx + larg, 6.0)]))
    b.peca("coroa", d, OURO, 1.8, cortes=CORTES, linha=OURO[0])
    for x in range(17, 47):
        b.ponto(x, 6, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 10, OURO[1])
    for cx, topo, _ in pontas:   # as bolinhas de ouro nas pontas
        b.peca("coroa", b.bola(cx, topo - 0.4, 1.3), OURO, 0.8, cortes=CORTES, linha=OURO[0])
    coracao(29, 6, RUBI, OURO[0])
    sombra = (b.yy == 12) & (b.xx >= 17) & (b.xx <= 46) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def toga():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, BRANCO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a faixa rosa em diagonal, do ombro esquerdo até o quadril direito, com a borda de ouro
    s = (b.py - 41.0) - (b.px - 18.0) * 0.75
    faixa = corpo & (np.abs(s) < 2.6)
    b.vestir("corpo", d_corpo, ROSA, 4.0, onde=faixa)
    b.pintar(corpo & (np.abs(s - 2.6) < 0.5), OURO[3])
    b.pintar(corpo & (np.abs(s + 2.6) < 0.5), OURO[4])
    # as dobras da toga
    for x in (22, 41):
        for y in range(52, 61):
            if corpo[y + b.OY, x + b.OX] and not faixa[y + b.OY, x + b.OX]:
                b.ponto(x, y, BRANCO[2])
    for cx in (14.5, 49.5):
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 50, OURO)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, OURO, None, livre)
    # o broche de coração no peito
    coracao(29, 46, ROSA, ROSA[0])


def arco():
    """o arco de ouro na mão esquerda e a flecha com a ponta de coração e as penas"""
    for y in range(37, 64):
        t = (y - 50.5) / 13.5
        x = int(round(9.5 - 4.0 * (1 - t * t)))
        b.ponto(x, y, OURO[4] if y < 50 else OURO[3]); b.ponto(x + 1, y, OURO[1])
    for y in range(37, 64):   # a corda
        b.ponto(11, y, BRANCO[3])
    for x in range(4, 22):   # a flecha atravessando
        b.ponto(x, 50, OURO[2] if x % 3 else OURO[4])
    for x, y in ((20, 49), (21, 49), (20, 51), (21, 51), (19, 49), (19, 51)):   # as penas
        b.ponto(x, y, ASA[2])
    coracao(-2, 48, RUBI, RUBI[0])   # a ponta de coração


def coracoes():
    for x0, y0 in ((-5, 22), (-2, 4)):
        for x in (x0, 58 - x0):
            coracao(x, y0, ROSA, ROSA[0])


if __name__ == "__main__":
    b.desenhar(atras=asas)
    toga()
    with b.deslocado(b.CABECA_DESCE):
        coroa()
    arco()
    coracoes()
    b.conferencia("browcupido")
