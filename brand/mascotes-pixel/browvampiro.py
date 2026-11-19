"""Browvampiro (raro, linha 2, coluna 9): o vampiro. Cabelo preto-azulado penteado para trás com o bico no meio da testa
e o brilho de gel; orelhas pontudas de brownie; dois caninos; a capa preta de gola alta com o forro vermelho por trás;
o terno preto com a camisa branca, a gravata-borboleta vermelha com o broche de rubi e o colete vinho.
python browvampiro.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

CABELO = [(8, 6, 24), (18, 14, 44), (30, 26, 70), (46, 42, 100), (70, 68, 140), (120, 120, 190)]
PRETO = [(8, 6, 16), (18, 14, 30), (30, 24, 46), (44, 38, 64), (64, 56, 88), (96, 88, 124)]
VERMELHO = [(60, 0, 10), (110, 6, 20), (160, 14, 30), (200, 30, 40), (232, 70, 70), (250, 130, 120)]
VINHO = [(40, 4, 14), (70, 10, 26), (100, 18, 38), (130, 30, 50), (160, 50, 66), (190, 80, 90)]
BRANCO = [(130, 126, 146), (184, 180, 200), (222, 220, 234), (240, 238, 248), (250, 249, 254), (255, 255, 255)]
RUBI = [(110, 0, 30), (200, 20, 60), (250, 90, 120), (255, 200, 210)]
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


def capa():
    """a capa por trás: a gola alta subindo dos dois lados da cabeça (forro vermelho) e o pano caindo dos lados"""
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        gola = poligono([(x(13.0), 46.0), (x(4.0), 26.0), (x(9.0), 28.0), (x(17.0), 44.0)])
        m, _ = b.peca("capa", gola, VERMELHO, 1.8, cortes=CORTES, linha=PRETO[0])
        fora = poligono([(x(12.0), 47.0), (x(3.0), 25.0), (x(5.0), 26.5), (x(14.0), 47.0)]) <= 0
        b.pintar(fora & m, PRETO[3])
    pano = b.caixa(10, 42, 53, 66, 4)
    m, _ = b.peca("capa", pano, PRETO, 3.0, cortes=CORTES, linha=PRETO[0])
    forro = m & ((b.px < 13.5) | (b.px > 49.5))
    b.pintar(forro, VERMELHO[2])
    b.pintar(forro & (b.px < MEIO), VERMELHO[3])


def orelhas():
    """as orelhas pontudas de brownie, saindo dos lados da cabeça, espelhadas"""
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        d = poligono([(x(13.0), 18.0), (x(1.0), 15.0), (x(13.0), 30.0)])
        m, _ = b.peca("orelha_vamp", d, b.BROWNIE, 2.0, cortes=CORTES, linha=b.CONTORNO_FORA)
        dentro = poligono([(x(12.0), 20.0), (x(5.0), 18.0), (x(12.0), 26.0)]) <= 0
        b.pintar(dentro & m, b.BROWNIE[1])


def cabelo():
    """o cabelo penteado para trás: o bico no meio da testa, as têmporas descendo dos lados, as mechas brilhando"""
    ax = np.abs(b.px - MEIO)
    borda = np.maximum(21.0 - 0.38 * ax, 9.0 + (ax - 13.0) * 1.6)   # o bico no meio e as têmporas nos lados
    d = np.maximum(b.caixa(9, 3, 54, 32, 11), b.py - borda)
    m, _ = b.peca("cabelo", d, CABELO, 3.0, cortes=CORTES, linha=CABELO[0])
    # as mechas penteadas para trás: saem da testa e sobem curvando para fora, espelhadas
    for x0, y0, comp in ((30, 17, 9), (25, 15, 9), (20, 15, 8), (15, 19, 8)):
        for k in range(comp):
            x = int(round(x0 - k * 0.45 - (k * k) * 0.03))
            y = y0 - k
            for xx in (x, 63 - x):
                if m[y + b.OY, xx + b.OX]:
                    b.ponto(xx, y, CABELO[4] if k < 3 else CABELO[3])
                    if m[y + b.OY, xx + 1 + b.OX]:
                        b.ponto(xx + 1, y, CABELO[1])
    for x, y in ((18, 6), (19, 6), (17, 7)):   # o brilho do gel no alto
        for xx in (x, 63 - x):
            b.ponto(xx, y, CABELO[5])
    # a sombra do cabelo na testa
    sombra = (b.peca_de == "cabeca") & (b.py - borda > 0) & (b.py - borda < 1.2)
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)

def caninos():
    """os dois dentes afiados dentro da boca, pendurados no céu da boca, espelhados"""
    for x in (29, 34):
        b.ponto(x, 34, BRANCO[3])
        b.ponto(x, 35, BRANCO[5])

def terno():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, PRETO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a camisa branca em V e o colete vinho por baixo
    camisa = corpo & (np.abs(b.px - MEIO) < 6.0 - (b.py - 42) * 0.45) & (b.py > 41)
    b.vestir("corpo", d_corpo, BRANCO, 4.0, onde=camisa)
    colete = corpo & ~camisa & (np.abs(b.px - MEIO) < 9.0 - (b.py - 42) * 0.1) & (b.py > 41) & (b.py < 59)
    b.vestir("corpo", d_corpo, VINHO, 4.0, onde=colete)
    # as lapelas: a beira do paletó em diagonal, espelhada
    for y in range(42, 58):
        meia = int(9.0 - (y - 42) * 0.1)
        b.ponto(31 - meia, y, PRETO[4]); b.ponto(32 + meia, y, PRETO[3])
    for y in (51, 55):   # os botões do colete
        b.ponto(31, y, BRANCO[4]); b.ponto(32, y, BRANCO[2])
    # a gravata-borboleta vermelha com o broche de rubi no nó
    for lado in (-1, 1):
        cx = MEIO + lado * 3.0
        b.peca("gravata", b.bola(cx, 45.5, 2.8, 1.9), VERMELHO, 1.2, cortes=CORTES, linha=VERMELHO[0])
    b.peca("gravata", b.bola(MEIO, 45.5, 1.4, 1.5), RUBI + RUBI[-2:], 1.0, linha=RUBI[0])
    b.ponto(31, 45, RUBI[3])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), PRETO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, BRANCO)   # os punhos da camisa
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), PRETO, 2.5)


if __name__ == "__main__":
    b.desenhar(atras=capa)
    terno()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas redondas dão lugar às pontudas
    with b.deslocado(b.CABECA_DESCE):
        orelhas()
        cabelo()
    caninos()   # a boca da base não desce com a cabeça
    b.conferencia("browvampiro")
