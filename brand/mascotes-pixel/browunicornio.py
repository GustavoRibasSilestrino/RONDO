"""Browunicórnio (épico, linha 3, coluna 10): fantasia de unicórnio. Capuz branco-perolado com o chifre espiral de ouro no
meio, as orelhas de cavalo pontudas de dentro rosa e a franja de crina em arco-íris pastel caindo na testa, o rosto à
mostra numa abertura de cantos arredondados; macacão branco com os cascos lilás, a estrela rosa no peito e o rabo de
crina arco-íris por trás; brilhinhos em volta.  python browunicornio.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

PEROLA = [(140, 120, 170), (196, 180, 220), (230, 222, 244), (244, 240, 252), (252, 250, 255), (255, 255, 255)]
OURO = [(140, 80, 20), (200, 130, 30), (240, 180, 50), (255, 214, 100), (255, 236, 160), (255, 250, 220)]
ROSA = [(150, 50, 110), (220, 100, 170), (246, 160, 206), (255, 200, 230)]
LILAS = [(80, 50, 140), (130, 100, 200), (176, 150, 236), (214, 196, 250), (234, 222, 255), (248, 242, 255)]
PASTEL = [(255, 150, 170), (255, 200, 140), (255, 240, 150), (160, 236, 170), (150, 200, 255), (200, 160, 255)]
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
        for t in np.linspace(0, 1, 12):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def rabo():
    """o rabo de crina arco-íris saindo por trás, à direita, em mechas onduladas, com um contorno só em volta"""
    mechas = []
    for k, cor in enumerate(PASTEL):
        y0 = 49 + k * 1.8
        mechas.append((tubo([(46.0, y0, 1.5), (53.0, y0 - 1.0, 1.4), (57.0, y0 + 2.0, 1.3), (59.0, y0 + 6.0, 1.0)]) <= 0, cor))
    tudo = np.zeros(b.img.shape[:2], bool)
    for m, _ in mechas:
        tudo |= m
    b.contorno(tudo, "rabo", LILAS[0])
    for m, cor in mechas:
        b.pintar(m, cor)
    b.peca_de[tudo] = "rabo"

def orelhas():
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        pts = [(x(11.0), 12.0), (x(13.5), -5.0), (x(21.0), 7.0)]
        b.peca("capuz", poligono(pts), PEROLA, 2.2, cortes=CORTES, linha=LILAS[1])
        dentro = poligono([(x(13.0), 9.0), (x(14.0), -1.0), (x(18.0), 6.0)]) <= 0
        b.pintar(dentro, ROSA[2])
        b.pintar(dentro & (b.py > 5), ROSA[1])


def capuz():
    abertura = b.caixa(16, 20, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, PEROLA, 4.0, cortes=CORTES, linha=LILAS[1])
    for x, y in ((12, 10), (13, 9), (14, 8), (11, 12)):   # o brilho perolado
        b.ponto(x, y, PEROLA[5])
    for x, y in ((11, 28), (12, 36)):   # reflexos lilases, espelhados
        for xx in (x, 63 - x):
            b.ponto(xx, y, LILAS[3])
    b.clarear(m & (abertura <= 1.6), PEROLA)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def franja():
    """a franja de crina arco-íris: mechas em arco caindo na testa, espelhadas, curtas (longe dos olhos); o contorno é
    um só em volta da franja inteira, e cada mecha tem o seu brilho"""
    mechas = []
    for k, cor in enumerate(PASTEL):
        dx = 2.5 + k * 2.7
        for lado in (-1, 1):
            cx = MEIO + lado * dx
            mechas.append((tubo([(cx, 8.0, 2.0), (cx + lado * 1.0, 14.0, 1.7), (cx + lado * 2.2, 19.5, 1.0)]) <= 0, cor, cx))
    tudo = np.zeros(b.img.shape[:2], bool)
    for m, _, _ in mechas:
        tudo |= m
    b.contorno(tudo, "franja", LILAS[1])
    for m, cor, cx in mechas:
        b.pintar(m, cor)
        b.pintar(m & (np.abs(b.px - cx) < 0.6) & (b.py < 14), PEROLA[5])
    b.peca_de[tudo] = "franja"

def chifre():
    """o chifre espiral de ouro no meio, com as voltas da espiral"""
    d = poligono([(MEIO - 3.6, 9.0), (MEIO, -12.13), (MEIO + 3.6, 9.0)])
    m, _ = b.peca("chifre", d, OURO, 1.6, cortes=CORTES, linha=OURO[0])
    for k in range(6):   # as voltas: riscos inclinados
        y = 7 - k * 3
        for i in range(-3, 4):
            x = int(round(MEIO - 0.5 + i))
            yy = y - (i + 3) // 3
            if m[yy + b.OY, x + b.OX]:
                b.ponto(x, yy, OURO[1])


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, PEROLA, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), PEROLA, 3.0)
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), LILAS, 3.0, onde=b.yy >= 53)   # os cascos das mãos
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), PEROLA, 2.5)
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), LILAS, 2.5, onde=b.yy >= 64)   # os cascos
    # a estrela rosa no peito, centralizada
    estrela = ["00011000", "00111100", "11111111", "01111110", "00111100", "01100110"]
    for j, linha in enumerate(estrela):
        for i, c in enumerate(linha):
            if c == "1":
                b.ponto(28 + i, 48 + j, ROSA[3] if i < 4 else ROSA[2])
    b.ponto(30, 50, PEROLA[5])


def brilhos():
    for x, y, t, cor in ((0, 14, 2, PASTEL[4]), (-3, 32, 1, PASTEL[0]), (5, 0, 1, PASTEL[2]), (-1, 46, 1, PASTEL[5])):
        for xx in (x, 63 - x):
            b.ponto(xx, y, PEROLA[5])
            for k in range(1, t + 1):
                for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                    b.ponto(xx + dx, y + dy, cor)


if __name__ == "__main__":
    b.desenhar(atras=rabo)
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas de bolo ficam dentro do capuz
    orelhas()
    capuz()
    franja()
    chifre()
    brilhos()
    b.conferencia("browunicornio")
