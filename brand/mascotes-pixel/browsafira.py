"""Browsafira (incomum, linha 1, coluna 12): a safira. Capuz azul-noite estrelado com o rosto à mostra numa abertura de
cantos arredondados e uma coroa de cristais de safira lapidados (cinco pontas, a do meio mais alta) presa numa tiara de
prata com pedrinhas; manto azul-noite com a barra e os punhos de prata e o pingente de safira numa correntinha.
python browsafira.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

NOITE = [(8, 10, 40), (18, 22, 76), (30, 36, 116), (46, 56, 156), (70, 84, 192), (110, 130, 226)]
SAFIRA = [(6, 40, 110), (14, 80, 180), (30, 130, 230), (70, 180, 250), (140, 220, 255), (220, 248, 255)]
PRATA = [(60, 66, 90), (110, 118, 146), (160, 168, 194), (204, 210, 230), (232, 236, 248), (255, 255, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def poligono(pontos):
    """distância com sinal (aproximada) de um polígono convexo, com os pontos em sentido horário na tela"""
    d = np.full(b.img.shape[:2], -99.0)
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]):
        nx, ny = y1 - y0, -(x1 - x0)
        n = np.hypot(nx, ny)
        d = np.maximum(d, ((b.px - x0) * nx + (b.py - y0) * ny) / n)
    return d


def cristal(cx, topo, base, larg):
    """um cristal lapidado em pé: ponta em cima, a face da esquerda clara, a da direita escura e o fio de luz no meio"""
    pts = [(cx, topo), (cx + larg, topo + larg * 1.3), (cx + larg, base), (cx - larg, base), (cx - larg, topo + larg * 1.3)]
    d = poligono(pts)
    m = d <= 0
    b.contorno(m, "coroa", SAFIRA[0])
    b.pintar(m, SAFIRA[2])
    b.pintar(m & (b.px < cx - 0.2), SAFIRA[3])
    b.pintar(m & (b.px < cx - larg + 1.2), SAFIRA[4])
    b.pintar(m & (b.px > cx + larg - 1.2), SAFIRA[1])
    b.pintar(m & (b.py < topo + larg * 1.3) & (b.px < cx), SAFIRA[5])   # a ponta pega a luz
    b.pintar(m & (np.abs(b.px - cx) < 0.6) & (b.py > topo + larg * 1.3), SAFIRA[4])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, NOITE, 4.0, cortes=CORTES, linha=NOITE[0])
    for x, y in ((13, 12), (12, 13), (11, 16)):   # brilho do tecido
        b.ponto(x, y, NOITE[5])
    for x, y in ((12, 22), (14, 38), (11, 31)):   # estrelinhas espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, y, PRATA[5])
    b.clarear(m & (abertura <= 1.6), NOITE)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def lasca(base, ponta, larg):
    """um cristal comprido e inclinado, da base até a ponta: a face de cima pega a luz, a de baixo fica na sombra e o
    fio de luz corre pelo meio; a ponta é chanfrada como um cristal lapidado"""
    (bx, by), (tx, ty) = base, ponta
    comp = np.hypot(tx - bx, ty - by)
    ux, uy = (tx - bx) / comp, (ty - by) / comp   # ao longo do cristal
    nx, ny = -uy, ux                              # de lado
    pts = [(bx + nx * larg, by + ny * larg), (tx - ux * larg * 1.4 + nx * larg, ty - uy * larg * 1.4 + ny * larg), (tx, ty),
           (tx - ux * larg * 1.4 - nx * larg, ty - uy * larg * 1.4 - ny * larg), (bx - nx * larg, by - ny * larg)]
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]))
    if area < 0:
        pts = pts[::-1]
    m = poligono(pts) <= 0
    lado = (b.px - bx) * nx + (b.py - by) * ny   # distância com sinal até o eixo
    cima = lado * (1 if ny < 0 else -1) > 0      # a metade de cima (mais perto da luz)
    b.contorno(m, "coroa", SAFIRA[0])
    b.pintar(m, SAFIRA[1])
    b.pintar(m & cima, SAFIRA[3])
    b.pintar(m & cima & (np.abs(lado) > larg - 1.1), SAFIRA[4])
    b.pintar(m & ~cima & (np.abs(lado) < 1.0), SAFIRA[2])
    ao_longo = (b.px - bx) * ux + (b.py - by) * uy
    b.pintar(m & cima & (ao_longo > comp - larg * 1.4), SAFIRA[5])   # a ponta brilha


def diamante():
    """o diamante do meio, lapidado: a coroa de cima (facetas claras) e o pavilhão de baixo, mais fundo"""
    topo, cintura, fundo, meia = -11.0, -1.0, 11.0, 8.0
    d = poligono([(MEIO, topo), (MEIO + meia, cintura), (MEIO, fundo), (MEIO - meia, cintura)])
    m = d <= 0
    b.contorno(m, "coroa", SAFIRA[0])
    b.pintar(m, SAFIRA[2])
    em_cima = b.py < cintura
    b.pintar(m & em_cima, SAFIRA[4])
    b.pintar(m & em_cima & (np.abs(b.px - MEIO) < 2.2) & (b.py > topo + 3), SAFIRA[5])   # a mesa
    b.pintar(m & ~em_cima & (np.abs(b.px - MEIO) > 2.4), SAFIRA[1])
    b.pintar(m & ~em_cima & (np.abs(b.px - MEIO) <= 1.0), SAFIRA[3])
    for x in range(23, 41):   # a cintura do diamante, uma linha de brilho
        if m[int(cintura) + b.OY, x + b.OX]:
            b.ponto(x, int(cintura), SAFIRA[3])


def coroa():
    # dois cristais compridos cruzando para fora, espelhados, e o diamante grande no meio na frente deles
    lasca((25.0, 10.0), (10.0, -8.0), 4.0)
    lasca((39.0, 10.0), (54.0, -8.0), 4.0)
    diamante()
    # a tiara de prata segurando os cristais, com as pedrinhas espelhadas
    tiara = b.caixa(13, 8, 51, 12, 2)
    b.peca("coroa", tiara, PRATA, 1.4, cortes=CORTES, linha=PRATA[0])
    for x in (18, 25):
        for xx in (x, 63 - x):
            b.ponto(xx, 9, SAFIRA[5]); b.ponto(xx, 11, SAFIRA[1])
            b.ponto(xx - 1, 10, SAFIRA[2]); b.ponto(xx, 10, SAFIRA[3]); b.ponto(xx + 1, 10, SAFIRA[2])
    for xx in (31, 32):
        b.ponto(xx, 9, SAFIRA[5]); b.ponto(xx, 10, SAFIRA[3]); b.ponto(xx, 11, SAFIRA[1])
    b.ponto(30, 10, SAFIRA[2]); b.ponto(33, 10, SAFIRA[2])


def manto():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, NOITE, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for x, y in ((20, 52), (24, 57), (21, 45)):   # estrelinhas espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, y, PRATA[4])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), NOITE, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, PRATA)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), NOITE, 2.5)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, PRATA, None, livre)


def pingente():
    """a correntinha de prata em V e o pingente de safira lapidado no meio do peito"""
    # a corrente começa logo abaixo do capuz (que termina na linha 44) e desce em V até a argolinha
    for k in range(4):
        x, y = 27 + k, 46 + k
        b.ponto(x, y, PRATA[4] if k % 2 else PRATA[2])
        b.ponto(63 - x, y, PRATA[4] if k % 2 else PRATA[2])
    pedra = poligono([(MEIO, 50.0), (MEIO + 3.0, 53.0), (MEIO, 56.0), (MEIO - 3.0, 53.0)])
    m = pedra <= 0
    b.contorno(m, "pingente", SAFIRA[0])
    b.pintar(m, SAFIRA[2])
    b.pintar(m & (b.px < MEIO), SAFIRA[3])
    b.pintar(m & (b.px < MEIO) & (b.py < 53.0), SAFIRA[4])
    b.pintar(m & (b.px > MEIO) & (b.py > 53.0), SAFIRA[1])
    b.ponto(30, 52, SAFIRA[5])
    b.ponto(31, 49, PRATA[5]); b.ponto(32, 49, PRATA[3])   # a argolinha


if __name__ == "__main__":
    b.desenhar()
    manto()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    capuz()
    coroa()
    pingente()
    b.conferencia("browsafira")
