"""Browglitch (lendário, linha 4, coluna 12): o glitch, o brownie que bugou. Corpo roxo digital com a calda ciano, os
olhos ciano; blocos de pixels corrompidos em magenta e ciano espalhados; as duas faixas onde a imagem rasgou e abriu
do meio para os lados, com a linha de luz no rasgo; o fantasma das cores (ciano à esquerda, magenta à direita) por trás
do contorno; as linhas de varredura; e os pixels mortos flutuando em volta.  python browglitch.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ROXO = [(20, 10, 44), (40, 22, 84), (64, 38, 126), (90, 58, 166), (122, 84, 204), (164, 124, 236)]
CIANO_CALDA = [(10, 40, 70), (20, 80, 120), (30, 130, 170), (60, 190, 220), (130, 230, 250), (220, 252, 255)]
CIANO = (60, 230, 255)
MAGENTA = (255, 60, 220)
BRANCO = (255, 255, 255)
MEIO = 32.0


def blocos():
    """os blocos de pixels corrompidos, espelhados (as mesmas posições dos dois lados)"""
    lista = [(14, 18, 3, 2, MAGENTA), (20, 30, 2, 2, CIANO), (12, 36, 4, 1, CIANO), (18, 46, 3, 2, MAGENTA),
             (22, 55, 2, 3, CIANO), (16, 60, 3, 1, MAGENTA), (26, 12, 2, 1, CIANO)]
    corpo = b.img[..., 3] > 0
    olho = np.zeros(corpo.shape, bool)
    for c in b.OLHO + [b.BRANCO, b.BOCA, b.LINGUA]:
        olho |= np.all(b.img[..., :3] == c, axis=2)
    for x0, y0, w, h, cor in lista:
        for x in range(x0, x0 + w):
            for y in range(y0, y0 + h):
                for xx in (x, 63 - x):
                    if corpo[y + b.OY, xx + b.OX] and not olho[y + b.OY, xx + b.OX]:
                        b.ponto(xx, y, cor)


def varredura():
    """as linhas de varredura: uma linha a cada três um tom mais escura"""
    for rampa in (b.BROWNIE, b.CALDA):
        b.escurecer((b.img[..., 3] > 0) & (b.yy.astype(int) % 3 == 0), rampa)


def rasgos():
    """duas faixas em que a imagem rasgou: a metade da esquerda escorrega 1 pixel para a esquerda, a da direita 1 para a
    direita, e no meio fica a linha de luz"""
    for y0, alt in ((26, 2), (52, 2)):
        for y in range(y0, y0 + alt):
            ya = y + b.OY
            esq = b.img[ya, :b.OX + 32].copy()
            dir_ = b.img[ya, b.OX + 32:].copy()
            b.img[ya, :b.OX + 31] = esq[1:]
            b.img[ya, b.OX + 33:] = dir_[:-1]
            for xx, cor in ((31, CIANO), (32, MAGENTA)):
                if b.img[ya, xx + b.OX - 1, 3] > 0 or b.img[ya, xx + b.OX + 1, 3] > 0:
                    b.ponto(xx, y, BRANCO if y == y0 else cor)


def fantasma():
    """o fantasma das cores por trás: o contorno repetido 2 pixels para fora, ciano à esquerda e magenta à direita"""
    cheio = b.img[..., 3] > 0
    esq = np.zeros_like(cheio); esq[:, :-2] = cheio[:, 2:]
    dir_ = np.zeros_like(cheio); dir_[:, 2:] = cheio[:, :-2]
    lado_esq = b.xx < MEIO - 0.5
    b.img[esq & ~cheio & lado_esq] = (*CIANO, 255)
    b.img[dir_ & ~cheio & ~lado_esq] = (*MAGENTA, 255)


def pixels_mortos():
    for x, y, cor in ((2, 6, MAGENTA), (-3, 22, CIANO), (5, 40, MAGENTA), (-1, 58, CIANO), (8, -6, CIANO)):
        for xx in (x, 63 - x - 1):
            for dx in (0, 1):
                for dy in (0, 1):
                    b.ponto(xx + dx, y + dy, cor)


if __name__ == "__main__":
    b.BROWNIE = ROXO
    b.CALDA = CIANO_CALDA
    b.OLHO = [(6, 30, 50), (14, 80, 110), (40, 160, 200)]
    b.desenhar()
    blocos()
    varredura()
    rasgos()
    fantasma()
    pixels_mortos()
    b.conferencia("browglitch")
