"""Browninja (épico, linha 3, coluna 11): o ninja. Capuz azul-índigo com o rosto à mostra numa abertura de cantos
arredondados, a faixa vermelha na testa com a plaquinha de aço marcada com uma estrela e as pontas da faixa voando por
trás; a espada nas costas com o cabo aparecendo por cima do ombro; o quimono índigo com a gola cruzada, a faixa vermelha
amarrada na cintura, os braços enfaixados e a estrela ninja de aço na mão.  python browninja.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

INDIGO = [(10, 8, 30), (22, 20, 62), (38, 36, 100), (58, 56, 140), (84, 82, 178), (124, 122, 212)]
VERMELHO = [(70, 6, 14), (130, 16, 26), (186, 32, 40), (220, 56, 54), (242, 96, 86), (252, 140, 124)]
ACO = [(50, 56, 76), (96, 104, 130), (146, 154, 180), (194, 200, 220), (226, 230, 244), (255, 255, 255)]
FAIXA = [(150, 140, 120), (200, 192, 172), (230, 224, 206), (246, 242, 228)]
PRETO = [(8, 6, 12), (20, 16, 26), (36, 30, 44)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 12):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def atras():
    """as pontas da faixa voando por trás"""
    for k, y0 in enumerate((14.0, 18.0)):
        pts = [(52.0, y0, 1.7), (58.0, y0 + 1.0 + k, 1.4), (63.0, y0 - 1.0 + k * 2, 1.1), (67.0, y0 + 1.0 + k * 2, 0.8)]
        b.peca("faixa", tubo(pts), VERMELHO, 1.2, cortes=CORTES, linha=VERMELHO[0])


def cabo():
    """a espada nas costas: só o cabo aparece, saindo por cima do ombro, na frente da quina do capuz"""
    # o cabo trançado saindo por cima do ombro, para fora do capuz, com a guarda de aço e o pomo vermelho
    for k in range(9):
        x, y = 51 + (k * 2) // 3, 6 - k
        b.ponto(x, y, PRETO[2] if k % 2 else ACO[3]); b.ponto(x + 1, y, PRETO[1]); b.ponto(x - 1, y, PRETO[0])
    for x, y in ((49, 7), (50, 7), (51, 7), (52, 7), (53, 7), (50, 8), (51, 8), (52, 8)):   # a guarda
        b.ponto(x, y, ACO[4] if y == 7 else ACO[1])
    b.ponto(56, -3, VERMELHO[3]); b.ponto(57, -3, VERMELHO[2]); b.ponto(56, -4, VERMELHO[4])   # o pomo


def capuz():
    abertura = b.caixa(16, 20, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, INDIGO, 4.0, cortes=CORTES, linha=INDIGO[0])
    for x, y in ((12, 10), (13, 9), (14, 8), (11, 12)):   # o brilho do pano
        b.ponto(x, y, INDIGO[5])
    for y in range(22, 42, 5):   # as dobras do pano, espelhadas
        for xx in (11, 52):
            b.ponto(xx, y, INDIGO[1]); b.ponto(xx, y + 1, INDIGO[1])
    b.clarear(m & (abertura <= 1.6), INDIGO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # a faixa vermelha na testa, dando a volta no capuz
    faixa = m & (b.yy >= 13) & (b.yy <= 17)
    for y, c in ((13, 1), (14, 4), (15, 3), (16, 2), (17, 1)):
        b.pintar(faixa & (b.yy == y), VERMELHO[c])
    b.escurecer(faixa & (np.abs(b.px - MEIO) > 19), VERMELHO)
    # a plaquinha de aço com a estrela marcada
    placa = b.caixa(25, 12, 38, 18, 1) <= 0
    b.contorno(placa, "placa", ACO[0])
    b.pintar(placa, ACO[3])
    b.pintar(placa & (b.py < 14), ACO[4])
    b.pintar(placa & (b.py > 17), ACO[2])
    for x, y in ((31, 13), (32, 13), (29, 15), (30, 15), (31, 15), (32, 15), (33, 15), (34, 15), (30, 16), (33, 16),
                 (31, 14), (32, 14), (31, 16), (32, 16)):
        b.ponto(x, y, ACO[1])
    for x in (26, 37):   # os rebites
        b.ponto(x, 15, ACO[5])


def quimono():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, INDIGO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a gola cruzada: a aba da esquerda passa por cima da da direita
    for y in range(42, 52):
        k = y - 42
        b.ponto(22 + k, y, INDIGO[5]); b.ponto(23 + k, y, INDIGO[1])
        if 41 - k > 32 + k:
            b.ponto(41 - k, y, INDIGO[4])
    # a faixa vermelha amarrada na cintura, dando a volta, com o nó e as pontinhas
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 53, VERMELHO, None, livre)
    b.peca("no", b.caixa(29, 52, 34, 56, 1), VERMELHO, 1.0, cortes=CORTES, linha=VERMELHO[0])
    for x, y in ((30, 57), (30, 58), (33, 57), (33, 58), (29, 59), (34, 59)):
        b.ponto(x, y, VERMELHO[3] if x < 32 else VERMELHO[2])
    # os braços enfaixados
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), INDIGO, 3.0, onde=b.yy <= 49)
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), FAIXA + FAIXA[-2:], 3.0, onde=b.yy > 49)
        for y in (51, 53):
            b.escurecer((b.peca_de == "braco") & (b.yy == y) & (b.bola(cx, 50, 4.2, 5.6) <= 0), FAIXA)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), INDIGO, 2.5)
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), PRETO + PRETO, 2.5, onde=b.yy >= 64)   # as botinhas


def shuriken():
    """a estrela ninja de aço na mão direita dele (à esquerda na tela)"""
    forma = ["00010000", "00011000", "00111100", "11100111", "11100111", "00111100", "00011000", "00001000"]
    for j, linha in enumerate(forma):
        for i, c in enumerate(linha):
            if c == "1":
                b.ponto(1 + i, 46 + j, ACO[4] if (i < 4 and j < 4) else ACO[2])
    for x, y in ((4, 49), (5, 49), (4, 50), (5, 50)):
        b.ponto(x, y, ACO[0])


if __name__ == "__main__":
    b.desenhar(atras=atras)
    quimono()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    capuz()
    cabo()
    shuriken()
    b.conferencia("browninja")
