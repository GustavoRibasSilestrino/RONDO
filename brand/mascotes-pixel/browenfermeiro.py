"""Browenfermeiro (incomum, linha 1, coluna 2): o enfermeiro. Touca branca de enfermagem dobrada, com a cruz vermelha;
jaleco branco com a gola em V mostrando o pijama verde-água por baixo, o bolso com canetas, o estetoscópio no pescoço
e luvas azuis.  python browenfermeiro.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

BRANCO = [(112, 118, 140), (170, 176, 196), (214, 218, 232), (238, 240, 248), (250, 251, 255), (255, 255, 255)]
AGUA = [(16, 80, 84), (30, 124, 126), (56, 168, 164), (110, 210, 198)]
VERMELHO = [(110, 14, 20), (196, 30, 36), (236, 66, 60)]
LUVA = [(40, 80, 150), (66, 118, 196), (100, 156, 230), (140, 190, 248), (180, 218, 255), (220, 238, 255)]
PRATA = [(60, 64, 78), (120, 126, 142), (186, 190, 204), (240, 242, 250)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def cruz(cx, cy, braco, grossura=2):
    """uma cruz vermelha centrada entre os pixels (cx = 31.5 fica simétrica)"""
    x0, y0 = int(cx - grossura / 2 + 0.5), int(cy - grossura / 2 + 0.5)
    for i in range(-braco, braco + grossura):
        for g in range(grossura):
            b.ponto(x0 + i, y0 + g, VERMELHO[1])
            b.ponto(x0 + g, y0 + i, VERMELHO[1])
    b.ponto(x0, y0 - braco, VERMELHO[2]); b.ponto(x0 - braco, y0, VERMELHO[2])


def touca():
    # a touca de enfermagem: uma faixa branca dobrada em cima da cabeça, um pouco mais larga em cima, entre as orelhas
    d = np.maximum(b.caixa(19, 4, 44, 14, 2), np.abs(b.px - 31.5) - (12.5 + (14 - b.py) * 0.15))
    m, _ = b.peca("touca", d, BRANCO, 2.5, cortes=CORTES, linha=BRANCO[0])
    # a dobra: a beira de baixo virada, um pouco mais escura, com o vinco
    b.trocar(m & (b.yy >= 12), BRANCO, [BRANCO[1], BRANCO[1], BRANCO[2], BRANCO[3], BRANCO[3], BRANCO[4]])
    for x in range(20, 44):
        b.ponto(x, 11, BRANCO[2])
    cruz(31.5, 7.5, 3)
    # sombra da touca na calda
    sombra = (b.yy == 15) & (b.peca_de == "cabeca") & (np.abs(b.px - 31.5) < 13)
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def jaleco():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, BRANCO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.escurecer(corpo & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), BRANCO)
    # a gola em V mostrando o pijama verde-água
    for y in range(42, 49):
        meia = 6 - (y - 42)
        for x in range(int(31.5 - meia), int(31.5 + meia) + 1):
            b.ponto(x, y, AGUA[2] if x < 32 else AGUA[1])
        b.ponto(int(31.5 - meia) - 1, y, BRANCO[1]); b.ponto(int(31.5 + meia) + 1, y, BRANCO[1])
    # a abertura do jaleco descendo, com botões brancos
    for y in range(49, 62):
        b.ponto(31, y, BRANCO[1])
    for y in (51, 55, 59):
        b.ponto(33, y, BRANCO[0])
    # mangas brancas e luvas azuis
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), BRANCO, 3.0, onde=b.yy <= 51)
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), LUVA, 3.0, onde=b.yy >= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, BRANCO)
    # o bolso com canetas e a cruz vermelha
    for x in range(20, 27):
        b.ponto(x, 50, BRANCO[1])
    for y in range(50, 56):
        b.ponto(20, y, BRANCO[1]); b.ponto(26, y, BRANCO[1])
    for x in range(20, 27):
        b.ponto(x, 56, BRANCO[1])
    for x, cor in ((22, LUVA[2]), (24, VERMELHO[1])):
        for y in (47, 48, 49):
            b.ponto(x, y, cor)
        b.ponto(x, 46, PRATA[2])
    cruz(23.5, 53.5, 1, 1)
    # o crachá do outro lado
    for x in range(37, 43):
        for y in range(51, 55):
            b.ponto(x, y, BRANCO[5] if y > 51 else AGUA[1])
    for x in range(38, 42):
        b.ponto(x, 53, BRANCO[1])


def estetoscopio():
    """o estetoscópio no pescoço: o tubo cinza faz um U no peito e o auscultador de prata fica pendurado no meio"""
    for t in np.linspace(0, np.pi, 40):
        x = 31.5 + 9.5 * np.cos(t)
        y = 41.5 + 8.0 * np.sin(t)
        b.ponto(int(np.floor(x)), int(round(y)), PRATA[1])
    for t in np.linspace(0.1, np.pi - 0.1, 30):   # a sombra do tubo, embaixo
        x = 31.5 + 9.5 * np.cos(t)
        y = 41.5 + 8.0 * np.sin(t) + 1
        xi, yi = int(np.floor(x)), int(round(y))
        if tuple(b.img[yi + b.OY, xi + b.OX, :3]) != PRATA[1]:
            b.ponto(xi, yi, PRATA[0])
    for y in (50, 51):
        b.ponto(31, y, PRATA[1]); b.ponto(32, y, PRATA[1])
    disco = b.bola(31.5, 53.5, 2.4, 2.2) <= 0
    b.contorno(disco, "estetoscopio", PRATA[0])
    b.pintar(disco, PRATA[2])
    b.ponto(30, 52, PRATA[3])
    b.ponto(32, 54, PRATA[1])


if __name__ == "__main__":
    b.desenhar()
    jaleco()
    estetoscopio()
    touca()
    b.conferencia("browenfermeiro")
