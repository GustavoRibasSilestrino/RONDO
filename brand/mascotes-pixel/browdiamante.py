"""Browdiamante (lendário, linha 4, coluna 9): o diamante. O browniezinho inteiro de diamante, branco-azulado e lapidado
em facetas triangulares (claras e escuras, espelhadas), com a calda de cristal; um diamante gigante de lapidação
brilhante flutuando em cima da cabeça, com a mesa, a coroa e o pavilhão; os brilhos de quatro pontas e os reflexos de
arco-íris do fogo do diamante em volta.  python browdiamante.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

DIAMANTE = [(70, 90, 140), (130, 156, 200), (180, 204, 236), (214, 230, 250), (236, 246, 255), (255, 255, 255)]
CRISTAL = [(60, 80, 130), (110, 140, 190), (160, 196, 232), (200, 226, 250), (230, 244, 255), (255, 255, 255)]
FOGO = [(255, 120, 170), (255, 220, 100), (120, 230, 200), (130, 170, 255), (210, 140, 255)]
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


def facetas():
    """as facetas triangulares no corpo inteiro: uma grade grande de losangos cortados ao meio, cada triângulo um tom
    mais claro ou mais escuro, espelhada em volta do meio; só mexe nos pixels de diamante (o contorno, os olhos e a boca
    ficam como estão)"""
    ax = np.abs(b.px - MEIO)
    u = np.floor((ax + b.py) / 11.0)
    v = np.floor((ax - b.py) / 11.0)
    claro = ((u + v) % 2 == 0)
    de_diamante = np.zeros(b.img.shape[:2], bool)
    for c in DIAMANTE[:5]:
        de_diamante |= np.all(b.img[..., :3] == c, axis=2)
    b.clarear(de_diamante & claro, DIAMANTE)

def diamante_grande():
    """o diamante gigante flutuando em cima da cabeça: a mesa em cima, a coroa inclinada e o pavilhão em ponta"""
    contorno = poligono([(25.0, -11.0), (39.0, -11.0), (45.0, -5.0), (MEIO, 9.0), (19.0, -5.0)])
    m = contorno <= 0
    b.contorno(m, "joia", DIAMANTE[0])
    b.pintar(m, DIAMANTE[3])
    coroa = m & (b.py < -5)
    b.pintar(coroa, DIAMANTE[4])
    b.pintar(coroa & (np.abs(b.px - MEIO) < 4.0) & (b.py < -8.5), DIAMANTE[5])          # a mesa
    b.pintar(coroa & (b.px > 39.0), DIAMANTE[2])
    pav = m & (b.py >= -5)
    ax = np.abs(b.px - MEIO)
    b.pintar(pav & (ax < (9.0 - (b.py + 5)) * 0.45), DIAMANTE[4])                       # a faceta do meio
    b.pintar(pav & (b.px > MEIO + 3) , DIAMANTE[1])
    b.pintar(pav & (b.px < MEIO - 3) & (b.py < 0), DIAMANTE[5])
    for x in range(20, 45):   # a cintura do diamante
        if m[-5 + b.OY, x + b.OX]:
            b.ponto(x, -5, DIAMANTE[5] if x < 32 else DIAMANTE[2])
    # os reflexos de arco-íris dentro do diamante
    for (x, y), cor in zip(((27, -2), (36, -2), (30, 2), (34, 3)), FOGO):
        b.ponto(x, y, cor)


def brilhos():
    """os brilhos de quatro pontas brancos e os pontinhos de arco-íris em volta, espelhados"""
    for x, y, t in ((1, 10, 3), (-3, 34, 2), (6, -6, 2), (2, 54, 1)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, DIAMANTE[5])
            for k in range(1, t + 1):
                cor = DIAMANTE[4] if k == 1 else DIAMANTE[3]
                for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                    b.ponto(xx + dx, y + dy, cor)
    for (x, y), cor in zip(((-5, 20), (5, 26), (-2, 46), (8, 2), (4, 62)), FOGO):
        b.ponto(x, y, cor); b.ponto(63 - x, y, cor)
    # um brilho no corpo, no ombro, e um no peito
    for x, y in ((20, 46), (31, 52)):
        b.ponto(x, y, DIAMANTE[5])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            b.ponto(x + dx, y + dy, DIAMANTE[4])
    b.ponto(43, 46, DIAMANTE[5])
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        b.ponto(43 + dx, 46 + dy, DIAMANTE[4])


if __name__ == "__main__":
    b.BROWNIE = DIAMANTE
    b.CALDA = CRISTAL
    b.desenhar()
    facetas()
    with b.deslocado(b.CABECA_DESCE):
        diamante_grande()
    brilhos()
    b.conferencia("browdiamante")
