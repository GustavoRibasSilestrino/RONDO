"""Browurso (incomum, linha 1, coluna 11): fantasia de ursinho azul. Capuz azul com as orelhas redondas de dentro rosa e
a abertura do rosto com a beira de pelúcia branca e fofa; macacão azul com a barriga mais clara, as patas com
almofadinhas rosa, um remendo costurado na perna como de ursinho de pelúcia e um pote de mel na mão.  python browurso.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

AZUL = [(10, 30, 80), (20, 60, 150), (36, 100, 210), (60, 144, 236), (110, 190, 250), (176, 228, 255)]
BRANCO = [(130, 150, 190), (180, 200, 230), (222, 234, 248), (240, 246, 252), (250, 252, 255), (255, 255, 255)]
ROSA = [(130, 30, 80), (196, 60, 120), (232, 110, 160), (250, 160, 196)]
POTE = [(80, 40, 12), (140, 76, 24), (190, 116, 40), (226, 160, 70), (246, 200, 120), (255, 232, 180)]
MEL = [(150, 80, 0), (220, 140, 10), (250, 190, 40), (255, 230, 120)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def orelhas():
    for cx in (15.0, 49.0):   # espelhadas em volta de 32
        m, _ = b.peca("capuz", b.bola(cx, 3.5, 6.0), AZUL, 2.4, cortes=CORTES, linha=AZUL[0])
        dentro = (b.bola(cx, 4.0, 3.3) <= 0) & m
        b.pintar(dentro, ROSA[2])
        b.pintar(dentro & (b.py > 5.0), ROSA[1])
        b.pintar(dentro & (b.py < 2.6) & (b.px < cx), ROSA[3])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, AZUL, 4.0, cortes=CORTES, linha=AZUL[0])
    for x, y in ((13, 9), (14, 8), (15, 8), (12, 10)):   # brilho do tecido
        b.ponto(x, y, AZUL[5])
    # a beira de pelúcia branca e fofa em volta do rosto
    pelucia = b.felpudo(np.abs(abertura - 1.6) - 2.2, 0.7)
    pm, _ = b.peca("pelucia", np.maximum(pelucia, d), BRANCO, 1.8, cortes=CORTES, linha=BRANCO[1])
    b.tufos(pm, BRANCO, 11, 0.14)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, AZUL, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.vestir("corpo", b.bola(MEIO, 53.0, 8.0, 6.5), AZUL[1:] + [BRANCO[3]], 3.0, onde=corpo)   # a barriga
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), AZUL, 3.0)
        b.ponto(int(cx), 54, ROSA[2]); b.ponto(int(cx) - 1, 53, ROSA[3]); b.ponto(int(cx) + 1, 53, ROSA[3])
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), AZUL, 2.5)
        for x, y in ((x0 + 3, 65), (x0 + 4, 65), (x0 + 2, 64), (x0 + 5, 64)):
            b.ponto(x, y, ROSA[2])
    # o remendo costurado no lado direito da roupa, inteiro dentro da margem, com os pontinhos da linha
    for x in range(41, 45):
        for y in range(55, 59):
            b.ponto(x, y, (250, 214, 110) if (x + y) % 2 else (236, 190, 80))
    for x in range(40, 46):
        for y in (54, 59):
            if x % 2 == 0:
                b.ponto(x, y, BRANCO[5])
    for y in range(55, 59):
        if y % 2 == 0:
            b.ponto(40, y, BRANCO[5]); b.ponto(45, y, BRANCO[5])


def pote():
    """o pote de mel na mão esquerda, com o mel escorrendo da boca e a etiqueta"""
    d = b.caixa(6, 48, 15, 58, 3)
    m, _ = b.peca("pote", d, POTE, 2.0, cortes=CORTES, linha=POTE[0])
    for x in range(6, 16):   # a beira da boca do pote
        b.ponto(x, 48, POTE[1]); b.ponto(x, 49, POTE[4] if x < 10 else POTE[3])
    for x in range(7, 15):   # o mel na boca e escorrendo
        b.ponto(x, 47, MEL[2] if x < 11 else MEL[1])
    for x, y in ((8, 50), (8, 51), (8, 52), (13, 50), (13, 51)):
        b.ponto(x, y, MEL[2])
    b.ponto(8, 53, MEL[1]); b.ponto(13, 52, MEL[1]); b.ponto(9, 47, MEL[3])
    for x in range(9, 13):   # a etiqueta
        for y in range(53, 56):
            b.ponto(x, y, BRANCO[4] if y == 53 else BRANCO[2])
    b.ponto(10, 54, POTE[0]); b.ponto(11, 54, POTE[0])
    b.peca("braco", b.bola(15.5, 53.0, 2.4, 2.2), AZUL, 1.2, cortes=CORTES, linha=AZUL[0])   # a mãozinha


if __name__ == "__main__":
    b.desenhar()
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas de bolo ficam dentro do capuz
    orelhas()
    capuz()
    pote()
    b.conferencia("browurso")
