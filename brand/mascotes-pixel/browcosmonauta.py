"""Browcosmonauta (épico, linha 3, coluna 2): o cosmonauta. Capacete branco redondo com as faixas magenta, o visor de
vidro lilás bem clarinho (o rosto e os olhos à mostra, só os reflexos ciano nos cantos) e as luzes ciano dos lados;
traje branco com as juntas roxas nos ombros, nos punhos e nos joelhos, o painel de controle no peito com as luzes, as
mangueiras saindo dele e as estrelinhas do espaço em volta.  python browcosmonauta.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

BRANCO = [(110, 100, 150), (168, 160, 204), (214, 210, 238), (236, 234, 250), (248, 247, 255), (255, 255, 255)]
ROXO = [(40, 12, 80), (76, 30, 140), (116, 56, 196), (156, 92, 232), (196, 140, 250), (230, 196, 255)]
MAGENTA = [(110, 10, 90), (190, 30, 150), (236, 80, 200), (255, 150, 230)]
CIANO = [(10, 90, 120), (40, 190, 220), (150, 245, 255), (230, 255, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def capacete():
    abertura = b.caixa(15, 18, 48, 40, 7)
    casco = b.caixa(7, 3, 56, 46, 16)
    d = np.maximum(casco, -abertura)
    m, _ = b.peca("capacete", d, BRANCO, 4.5, cortes=CORTES, linha=ROXO[0])
    # as faixas magenta no casco, espelhadas, e a do meio
    for x0 in (20, 24):
        for y in range(4, 16):
            x = x0 - (y - 4) // 4
            for xx in (x, 63 - x):
                if m[y + b.OY, xx + b.OX] and abertura[y + b.OY, xx + b.OX] > 1.5:
                    b.ponto(xx, y, MAGENTA[2] if x0 == 20 else MAGENTA[1])
    for y in range(4, 15):
        b.ponto(31, y, MAGENTA[3]); b.ponto(32, y, MAGENTA[2])
    # o brilho do casco
    for x, y in ((13, 8), (14, 7), (15, 6), (12, 10), (12, 11)):
        b.ponto(x, y, BRANCO[5])
    # o aro roxo em volta do visor
    aro = m & (abertura <= 2.2)
    b.pintar(aro, ROXO[3])
    b.pintar(aro & (b.py < 28), ROXO[4])
    b.pintar(aro & (abertura <= 0.8), ROXO[1])
    # o vidro: lilás bem clarinho, quase transparente, e os reflexos ciano nos cantos (longe dos olhos)
    vidro = (abertura <= 0) & (b.img[..., 3] > 0)
    lilas = np.array((210, 190, 255), float)
    b.img[vidro, :3] = np.round(b.img[vidro, :3] * 0.8 + lilas * 0.2).astype(b.img.dtype)
    for x, y, c in ((17, 21, 3), (18, 20, 3), (19, 20, 2), (20, 20, 2), (17, 22, 2), (17, 23, 1), (22, 20, 1),
                    (46, 36, 2), (46, 37, 1), (45, 38, 1)):
        b.ponto(x, y, CIANO[c])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # as luzes ciano dos lados, num suporte roxo (caixas espelhadas: x0 + x1 = 63)
    for x0, x1, xs in ((5, 9, (6, 7)), (54, 58, (57, 56))):
        b.peca("luz", b.caixa(x0, 23, x1, 35, 2), ROXO, 1.4, cortes=CORTES, linha=ROXO[0])
        for y in range(25, 34):
            b.ponto(xs[0], y, CIANO[2] if y < 29 else CIANO[1])
            b.ponto(xs[1], y, CIANO[1] if y < 29 else CIANO[0])

def traje():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, BRANCO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), BRANCO, 3.0)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 46, ROXO)   # a junta do ombro
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, ROXO)   # o punho
    for x0 in (21, 35):
        m = b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), BRANCO, 2.5)
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ROXO, 2.5, onde=b.yy >= 64)   # as botas
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 58, ROXO, None, livre)
    # o painel de controle no peito: a caixa branca com as luzes e o visorzinho
    painel = b.caixa(24, 48, 39, 55, 1) <= 0
    b.contorno(painel, "painel", ROXO[0])
    b.pintar(painel, BRANCO[4])
    b.pintar(painel & (b.py > 53), BRANCO[2])
    for x in range(26, 30):
        for y in (50, 51):
            b.ponto(x, y, CIANO[1] if y == 50 else CIANO[0])
    b.ponto(26, 50, CIANO[3])
    for x, c in ((33, MAGENTA[2]), (36, ROXO[3])):
        b.ponto(x, 50, c); b.ponto(x + 1, 50, c); b.ponto(x, 51, c); b.ponto(x + 1, 51, c)
    b.ponto(33, 50, MAGENTA[3])
    for x in (27, 30, 33, 36):   # os botõezinhos de baixo
        b.ponto(x, 53, ROXO[2])
    # as mangueiras saindo do painel para os lados, espelhadas
    for x, y in ((23, 52), (22, 53), (21, 54), (20, 54)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, ROXO[3]); b.ponto(xx, y + 1, ROXO[1])


def estrelas():
    for x, y, t in ((-3, 8, 2), (2, 44, 1), (-5, 30, 1), (6, -4, 1)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, BRANCO[5])
            for k in range(1, t + 1):
                for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                    b.ponto(xx + dx, y + dy, ROXO[4] if k == 1 else ROXO[3])


if __name__ == "__main__":
    b.desenhar()
    traje()
    b.img[b.peca_de == "orelha", 3] = 0   # o capacete cobre as orelhas
    capacete()
    estrelas()
    b.conferencia("browcosmonauta")
