"""Browsamurai (épico, linha 3, coluna 9): o samurai. Elmo (kabuto) vermelho laqueado com as nervuras, a beira de ouro, o
emblema de ouro na frente e o grande V de ouro (kuwagata) de pontas curvas, as abas viradas para fora dos lados e o
protetor de nuca de placas descendo por cima das orelhas; armadura vermelha de placas amarradas com os cordões de ouro, a
gola de ouro em V, as ombreiras de placas nos braços e a katana na cintura.  python browsamurai.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

VERMELHO = [(60, 4, 10), (116, 12, 20), (170, 26, 30), (210, 46, 40), (236, 86, 70), (250, 132, 112)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
PRETO = [(8, 6, 12), (20, 16, 26), (36, 30, 44), (56, 50, 66), (86, 78, 98), (130, 120, 146)]
ACO = [(60, 66, 90), (110, 118, 146), (160, 168, 194), (204, 210, 230), (232, 236, 248), (255, 255, 255)]
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


def placas(x0, x1, y0, linhas, alt=3):
    """placas de armadura amarradas: fileiras vermelhas com a beira de baixo escura e os pontos de cordão de ouro"""
    for k in range(linhas):
        y = y0 + k * alt
        d = b.caixa(x0, y, x1, y + alt, 1)
        m, _ = b.peca("placa", d, VERMELHO, 1.2, cortes=CORTES, linha=VERMELHO[0])
        for x in range(x0 + 1, x1, 2):
            b.ponto(x, y + 1, OURO[3])


def kabuto():
    # o protetor de nuca: placas descendo dos dois lados, por cima das orelhas (espelhadas: x0 + x1 = 63)
    placas(8, 16, 13, 4)
    placas(47, 55, 13, 4)
    # as abas viradas para fora (fukigaeshi), espelhadas
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        d = poligono([(x(13.0), 7.0), (x(4.0), 4.0), (x(3.0), 11.0), (x(13.0), 14.0)])
        m, _ = b.peca("aba", d, VERMELHO, 1.6, cortes=CORTES, linha=VERMELHO[0])
        borda = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        b.pintar(borda, OURO[3])
    # a tigela do elmo, com as nervuras e a beira de ouro
    tigela = b.caixa(12, 3, 51, 14, 7)
    m, _ = b.peca("kabuto", tigela, VERMELHO, 3.0, cortes=CORTES, linha=VERMELHO[0])
    for x in (18, 24, 29):
        for xx in (x, 63 - x):
            for y in range(4, 12):
                if m[y + b.OY, xx + b.OX]:
                    b.ponto(xx, y, VERMELHO[1])
    for x in range(12, 52):
        b.ponto(x, 12, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 13, OURO[2] if x < 32 else OURO[1])
    # o V de ouro com as pontas curvas (kuwagata), espelhado
    v = np.minimum(tubo([(30.0, 6.0, 1.6), (25.0, -3.0, 1.4), (21.0, -10.0, 1.2), (19.0, -12.0, 1.3)]),
                   tubo([(34.0, 6.0, 1.6), (39.0, -3.0, 1.4), (43.0, -10.0, 1.2), (45.0, -12.0, 1.3)]))
    b.peca("kuwagata", v, OURO, 1.4, cortes=CORTES, linha=OURO[0])
    # o emblema na frente: o disco de ouro com o miolo vermelho
    b.peca("emblema", b.bola(MEIO, 7.5, 3.4, 3.0), OURO, 1.4, cortes=CORTES, linha=OURO[0])
    b.peca("emblema", b.bola(MEIO, 7.5, 1.6, 1.4), VERMELHO, 1.0, cortes=CORTES, linha=VERMELHO[0])
    b.ponto(31, 7, VERMELHO[5])
    sombra = (b.yy == 14) & (b.xx >= 12) & (b.xx <= 51) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def armadura():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, VERMELHO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # as fileiras de placas amarradas: a beira escura e os pontos de cordão de ouro, espelhados
    for y in (49, 53, 57):
        b.pintar(corpo & (b.yy == y), VERMELHO[1])
        for x in range(18, 32, 2):
            for xx in (x, 63 - x):
                if corpo[y - 1 + b.OY, xx + b.OX]:
                    b.ponto(xx, y - 1, OURO[3])
    # a gola de ouro em V
    for y in range(42, 48):
        meia = 6 - (y - 42)
        b.ponto(31 - meia, y, OURO[4]); b.ponto(32 + meia, y, OURO[2])
        b.ponto(31 - meia + 1, y, OURO[2]) if meia > 0 else None
        b.ponto(32 + meia - 1, y, OURO[1]) if meia > 0 else None
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), PRETO, 2.5)
    # as ombreiras de placas nos braços (espelhadas: x0 + x1 = 63)
    placas(9, 19, 43, 3)
    placas(44, 54, 43, 3)


def katana():
    """a katana na cintura do lado esquerdo: o cabo trançado preto, a guarda de ouro e a bainha"""
    for k in range(12):   # a bainha preta descendo para trás
        x, y = 22 - k // 2, 58 + k // 3
        b.ponto(x, y, PRETO[2]); b.ponto(x, y + 1, PRETO[1])
    for x, y in ((23, 57), (24, 57), (23, 58), (24, 58)):   # a guarda de ouro
        b.ponto(x, y, OURO[4] if y == 57 else OURO[2])
    for k in range(6):   # o cabo trançado saindo para a frente
        x, y = 25 + k, 56 - k // 2
        b.ponto(x, y, ACO[4] if k % 2 else PRETO[1])
        b.ponto(x, y + 1, PRETO[0])


if __name__ == "__main__":
    b.desenhar()
    armadura()
    b.img[b.peca_de == "orelha", 3] = 0   # o protetor de nuca cobre as orelhas
    with b.deslocado(b.CABECA_DESCE):
        kabuto()
    katana()
    b.conferencia("browsamurai")
