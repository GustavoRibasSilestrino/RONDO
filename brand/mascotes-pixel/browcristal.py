"""Browcristal (raro, linha 2, coluna 6): o cristal. Capuz de cristal lapidado, de cantos chanfrados e facetas com as
quinas de luz, o rosto à mostra numa abertura de cantos arredondados; tufos de cristais pontudos saindo em cima e
dos lados; armadura de cristal com a gola de arco-íris em V e o prisma na ponta.  python browcristal.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

CRISTAL = [(40, 44, 120), (66, 100, 190), (104, 160, 232), (154, 210, 250), (206, 238, 255), (250, 254, 255)]
LILAS = [(70, 50, 140), (120, 100, 210), (176, 160, 246), (222, 212, 255)]
ARCO = [(250, 70, 90), (255, 150, 50), (255, 220, 60), (90, 220, 110), (70, 170, 250), (160, 100, 240)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def poligono(pontos):
    """distância com sinal (aproximada) de um polígono convexo; a ordem dos pontos é acertada sozinha"""
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]))
    if area < 0:
        pontos = pontos[::-1]
    d = np.full(b.img.shape[:2], -99.0)
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]):
        nx, ny = y1 - y0, -(x1 - x0)
        n = np.hypot(nx, ny)
        d = np.maximum(d, ((b.px - x0) * nx + (b.py - y0) * ny) / n)
    return d


def ponta(base, topo, larg, nome="cristal"):
    """um cristal pontudo (prisma com a ponta lapidada), da base até o topo, em qualquer inclinação"""
    (bx, by), (tx, ty) = base, topo
    comp = np.hypot(tx - bx, ty - by)
    ux, uy = (tx - bx) / comp, (ty - by) / comp
    nx, ny = -uy, ux
    k = larg * 1.3
    pts = [(bx + nx * larg, by + ny * larg), (tx - ux * k + nx * larg, ty - uy * k + ny * larg), (tx, ty),
           (tx - ux * k - nx * larg, ty - uy * k - ny * larg), (bx - nx * larg, by - ny * larg)]
    m = poligono(pts) <= 0
    lado = (b.px - bx) * nx + (b.py - by) * ny
    claro = lado * (1 if (nx < 0 or (nx == 0 and ny < 0)) else -1) > 0   # a face virada para a esquerda pega a luz
    b.contorno(m, nome, CRISTAL[0])
    b.pintar(m, CRISTAL[2])
    b.pintar(m & claro, CRISTAL[4])
    b.pintar(m & ~claro & (np.abs(lado) > larg - 1.1), CRISTAL[1])
    b.pintar(m & (np.abs(lado) < 0.5), CRISTAL[5])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    casco = poligono([(15, 5), (49, 5), (56, 12), (56, 38), (50, 45), (14, 45), (8, 38), (8, 12)])
    d = np.maximum(casco, -abertura)
    m, _ = b.peca("capuz", d, CRISTAL, 3.0, cortes=CORTES, linha=CRISTAL[0])
    # as facetas: as quinas dos chanfros e as arestas descendo até a abertura, espelhadas
    for x0, y0, x1, y1, cor in ((15, 6, 20, 19, 5), (9, 12, 16, 22, 4), (9, 38, 16, 36, 1), (24, 6, 26, 19, 4)):
        for t in np.linspace(0, 1, 16):
            x, y = int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t))
            for xx in (x, 63 - x):
                if m[y + b.OY, xx + b.OX]:
                    b.ponto(xx, y, CRISTAL[cor])
    for x, y in ((12, 15), (13, 14), (11, 17), (20, 9), (21, 9)):   # os reflexos lilases do cristal
        for xx in (x, 63 - x):
            b.ponto(xx, y, LILAS[3])
    b.clarear(m & (abertura <= 1.6), CRISTAL)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def tufos():
    """os tufos de cristais pontudos saindo do capuz, espelhados"""
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        ponta((x(23.0), 8.0), (x(19.0), -4.0), 2.6)       # em cima, abrindo para fora
        ponta((x(15.0), 10.0), (x(6.0), 2.0), 2.4)        # no canto de cima
        ponta((x(10.0), 30.0), (x(1.0), 27.0), 2.4)       # do lado
        ponta((x(11.0), 34.0), (x(4.0), 38.0), 1.8)
    ponta((MEIO, 8.0), (MEIO, -8.0), 3.2)                 # o grande no meio


def armadura():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, CRISTAL, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for x0, y0, x1, y1 in ((19, 44, 23, 60), (24, 58, 30, 61)):   # arestas das placas, espelhadas
        for t in np.linspace(0, 1, 16):
            x, y = int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t))
            for xx in (x, 63 - x):
                if corpo[y + b.OY, xx + b.OX]:
                    b.ponto(xx, y, CRISTAL[4])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), CRISTAL, 3.0)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, LILAS + LILAS[-2:])
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), CRISTAL, 2.5)
    # a gola de arco-íris em V: seis faixas em chevron, uma de cada cor, descendo até a ponta no meio do peito
    s = b.py + 0.75 * np.abs(b.px - MEIO)
    for i, cor in enumerate(ARCO):
        b.pintar(corpo & (s >= 52.5 + i) & (s < 53.5 + i) & (np.abs(b.px - MEIO) < 11), cor)
    # o prisma: um losango branco lapidado dentro do V
    prisma = poligono([(MEIO, 45.0), (MEIO + 3.0, 48.5), (MEIO, 52.0), (MEIO - 3.0, 48.5)]) <= 0
    b.contorno(prisma, "prisma", CRISTAL[0])
    b.pintar(prisma, CRISTAL[4])
    b.pintar(prisma & (b.px < MEIO), CRISTAL[5])
    b.pintar(prisma & (b.px >= MEIO) & (b.py > 48.5), CRISTAL[3])

if __name__ == "__main__":
    b.desenhar()
    armadura()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    tufos()
    capuz()
    b.conferencia("browcristal")
