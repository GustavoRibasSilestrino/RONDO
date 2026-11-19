"""Browpedreiro (incomum, linha 1, coluna 0): o pedreiro. Capacete de obra amarelo com as nervuras no alto e a aba em
volta; macacão jeans de peito e alças, com bolso, costuras e botões de latão; e um martelo na mão.  python browpedreiro.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

AMARELO = [(110, 70, 6), (176, 120, 10), (226, 170, 20), (250, 204, 40), (255, 228, 96), (255, 246, 180)]
JEANS = [(14, 26, 60), (26, 46, 100), (40, 70, 140), (58, 98, 178), (92, 134, 210), (150, 184, 236)]
LATAO = [(96, 60, 10), (170, 120, 30), (226, 180, 60), (255, 230, 140)]
MADEIRA = [(52, 26, 12), (96, 54, 24), (140, 86, 44), (184, 124, 72)]
METAL = [(40, 44, 54), (80, 86, 100), (130, 136, 152), (190, 196, 210), (240, 244, 250)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def capacete():
    # a copa: um domo cobrindo a cabeça inteira
    copa = np.maximum(b.bola(31.5, 14.5, 22.0, 12.5), b.py - 15)
    m, _ = b.peca("capacete", copa, AMARELO, 3.5, cortes=CORTES, linha=AMARELO[0])
    # as nervuras: três costelas em relevo correndo de frente para trás (luz à esquerda, sombra à direita)
    for x in (25, 31, 37):   # pares de pixels espelhados em volta de x = 31.5
        for y in range(2, 15):
            if m[y + b.OY, x + b.OX] and m[y + b.OY, x + 1 + b.OX]:
                b.ponto(x, y, AMARELO[5] if y < 8 else AMARELO[4])
                b.ponto(x + 1, y, AMARELO[2])
    # o adesivo da obra na frente: um losango laranja com uma faixa branca
    for dy, larg in ((7, 1), (8, 2), (9, 3), (10, 2), (11, 1)):
        for dx in range(-larg, larg):
            b.ponto(32 + dx, dy, (236, 110, 30) if dy != 9 else (250, 250, 240))
    # a aba em volta, um pouco mais larga que a cabeça
    aba = b.caixa(8, 14, 55, 17, 1)
    am, _ = b.peca("capacete", aba, AMARELO, 1.2, cortes=CORTES, linha=AMARELO[0])
    b.trocar(am & (b.yy == 17), AMARELO, [AMARELO[1]] * 6)
    # sombra da aba na testa
    for y, passos in ((18, 2), (19, 1)):
        sombra = (b.yy == y) & (b.peca_de == "cabeca")
        b.escurecer(sombra, b.BROWNIE, passos)
        b.escurecer(sombra, b.CALDA, passos)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    # o jeans cobre da cintura para baixo e o peitilho no meio; as alças sobem pelos ombros
    peitilho = (np.abs(b.px - 31.5) <= 8) & (b.yy >= 44)
    calca = b.yy >= 52
    alcas = (np.abs(np.abs(b.px - 31.5) - 11.5) <= 1.6) & (b.yy < 52)
    corpo = b.vestir("corpo", d_corpo, JEANS, 4.0, extra=-0.05 * (b.yy - 40) / 22, onde=peitilho | calca | alcas)
    # costuras claras: a beira do peitilho e a cintura
    for y in range(44, 52):
        b.ponto(23, y, JEANS[4]); b.ponto(40, y, JEANS[4])
    for x in range(23, 41):
        b.ponto(x, 44, JEANS[4])
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    for x in range(16, 48):
        if livre[52 + b.OY, x + b.OX] and corpo[52 + b.OY, x + b.OX]:
            b.ponto(x, 52, JEANS[1])
    # o bolso do peito, com a costura e uma régua dobrada saindo
    for x in range(27, 37):
        b.ponto(x, 46, JEANS[1])
    for y in range(46, 51):
        b.ponto(27, y, JEANS[1]); b.ponto(36, y, JEANS[1])
    for x in range(27, 37):
        b.ponto(x, 51, JEANS[1])
    for y in range(43, 47):
        b.ponto(34, y, AMARELO[3]); b.ponto(35, y, AMARELO[1])
    # os botões de latão nas alças
    for x in (23, 39):
        b.ponto(x, 45, LATAO[3]); b.ponto(x + 1, 45, LATAO[2]); b.ponto(x, 46, LATAO[1]); b.ponto(x + 1, 46, LATAO[0])


def martelo():
    """o martelo na mão direita: o cabo de madeira em diagonal e a cabeça de metal em cima"""
    for i in range(11):
        x, y = int(round(50 + i * 0.45)), 55 - i
        b.ponto(x - 1, y, MADEIRA[0]); b.ponto(x, y, MADEIRA[3] if i % 4 == 0 else MADEIRA[2])
        b.ponto(x + 1, y, MADEIRA[1]); b.ponto(x + 2, y, MADEIRA[0])
    cabeca = b.caixa(50, 41, 59, 45, 1)
    m = cabeca <= 0
    b.contorno(m, "martelo", METAL[0])
    b.pintar(m, METAL[2])
    b.pintar(m & (b.yy == 41), METAL[4])
    b.pintar(m & (b.yy == 45), METAL[1])
    b.pintar(m & (b.xx == 50), METAL[1])   # a unha (o lado de tirar prego)
    b.ponto(51, 42, METAL[4])


if __name__ == "__main__":
    b.desenhar()
    macacao()
    martelo()
    capacete()
    b.img[b.peca_de == "orelha", 3] = 0   # o capacete cobre as orelhas
    b.conferencia("browpedreiro")
