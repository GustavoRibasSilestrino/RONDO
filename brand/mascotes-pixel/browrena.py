"""Browrena (raro, linha 2, coluna 12): a rena. Galhada de rena cor de creme, ramificada e espelhada, com um raminho de
azevinho num dos lados; orelhas de veado deitadas para fora com o dentro claro; o nariz vermelho brilhante; o arreio de
couro vermelho com os guizos de ouro e o cachecol listrado verde e branco.  python browrena.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

GALHADA = [(90, 62, 30), (150, 112, 62), (196, 160, 104), (224, 196, 146), (242, 224, 186), (252, 244, 220)]
NARIZ = [(90, 0, 10), (170, 10, 24), (220, 30, 40), (246, 70, 70), (255, 130, 120), (255, 200, 190)]
VERMELHO = [(64, 6, 14), (120, 14, 26), (176, 28, 38), (214, 50, 50), (238, 90, 84), (252, 140, 124)]
VERDE = [(10, 50, 26), (20, 96, 46), (34, 140, 64), (64, 180, 90), (120, 214, 136), (190, 240, 196)]
BRANCO = [(130, 126, 146), (184, 180, 200), (222, 220, 234), (240, 238, 248), (250, 249, 254), (255, 255, 255)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
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


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 10):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def galhada():
    galhos = [
        [(23.0, 13.0, 2.2), (20.0, 5.0, 1.8), (17.0, -3.0, 1.5), (16.0, -8.0, 1.2)],   # o tronco
        [(20.0, 5.0, 1.5), (13.0, 1.0, 1.3), (9.0, -3.0, 1.1)],                         # galho de fora
        [(18.0, 0.0, 1.3), (22.0, -5.0, 1.1), (23.0, -9.0, 1.0)],                       # galho de dentro
        [(13.0, 1.0, 1.1), (11.0, 6.0, 1.0)],                                           # raminho caindo
    ]
    d = np.full(b.img.shape[:2], 99.0)
    for lado in (-1, 1):
        for g in galhos:
            d = np.minimum(d, tubo([(MEIO + lado * (x - MEIO), y, r) for x, y, r in g]))
    m, _ = b.peca("galhada", d, GALHADA, 1.6, cortes=CORTES, linha=GALHADA[0])
    # o azevinho na base da galhada esquerda: duas folhas verdes e as bolinhas vermelhas
    for x, y, c in ((17, 8, 3), (18, 8, 2), (16, 9, 2), (17, 9, 1), (21, 9, 3), (22, 9, 2), (22, 10, 1), (21, 10, 2)):
        b.ponto(x, y, VERDE[c])
    for x, y, c in ((19, 9, 4), (20, 9, 3), (19, 10, 2), (20, 10, 2)):
        b.ponto(x, y, NARIZ[c])


def orelhas():
    """as orelhas de veado deitadas para fora, espelhadas, com o dentro claro"""
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        d = poligono([(x(14.0), 15.0), (x(3.0), 13.0), (x(1.0), 16.0), (x(6.0), 20.0), (x(14.0), 22.0)])
        m, _ = b.peca("orelha_rena", d, b.BROWNIE, 2.0, cortes=CORTES, linha=b.CONTORNO_FORA)
        dentro = poligono([(x(12.0), 16.5), (x(5.0), 15.5), (x(4.0), 16.5), (x(7.0), 19.0), (x(12.0), 20.0)]) <= 0
        b.pintar(dentro & m, GALHADA[3])
        b.pintar(dentro & m & (b.py > 18), GALHADA[2])


def nariz():
    """o nariz vermelho brilhante, por cima do narizinho de urso"""
    b.peca("nariz", b.bola(MEIO, 31.0, 2.4, 1.9), NARIZ, 1.4, cortes=CORTES, linha=NARIZ[0])
    b.ponto(30, 30, NARIZ[5]); b.ponto(31, 30, NARIZ[4])


def arreio():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    # o cachecol listrado verde e branco dando a volta no pescoço, com a ponta caindo do lado
    gola = np.maximum(b.bola(MEIO, 43.0, 16.5, 4.2), -b.bola(MEIO, 39.0, 9.0, 3.6))
    m, _ = b.peca("cachecol", gola, VERDE, 2.0, cortes=CORTES, linha=VERDE[0])
    listra = m & (np.floor((b.px + 0.0) / 3.0) % 2 == 0)
    b.trocar(listra, VERDE, BRANCO)
    ponta = b.caixa(37, 44, 41, 54, 1)
    pm, _ = b.peca("cachecol", ponta, VERDE, 1.4, cortes=CORTES, linha=VERDE[0])
    b.trocar(pm & (np.floor(b.py / 2.0) % 2 == 0), VERDE, BRANCO)
    for x in (37, 39, 41):   # a franja
        b.ponto(x, 55, VERDE[3])
    # o arreio de couro vermelho dando a volta na barriga, com os guizos de ouro
    b.faixa_envolvente(d_corpo <= 0, 55, VERMELHO, None, livre)
    for cx in (23.5, 40.5, MEIO):
        b.peca("guizo", b.bola(cx, 58.5, 1.9), OURO, 1.2, cortes=CORTES, linha=OURO[0])
        x = int(np.floor(cx))
        b.ponto(x - 1 if cx != MEIO else 31, 58, OURO[5])
        b.ponto(x if cx != MEIO else 31, 59, OURO[0]); b.ponto(x if cx != MEIO else 32, 59, OURO[0])


if __name__ == "__main__":
    b.desenhar()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas redondas dão lugar às de veado
    with b.deslocado(b.CABECA_DESCE):
        galhada()
        orelhas()
    nariz()   # o rosto da base não desce com a cabeça
    arreio()
    b.conferencia("browrena")
