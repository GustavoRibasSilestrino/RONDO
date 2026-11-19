"""Browmago (comum, linha 0, coluna 9): o mago. Chapéu de bruxo roxo, pontudo e de ponta tombada, com a aba larga, a
faixa de ouro e uma estrela; túnica roxa com estrelinhas e barrado de ouro, punhos de ouro e uma varinha mágica com uma
estrela brilhando na ponta.  python browmago.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ROXO = [(30, 12, 56), (56, 24, 100), (86, 40, 146), (116, 60, 188), (150, 96, 222), (194, 148, 246)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
MADEIRA = [(40, 20, 10), (78, 42, 20), (118, 70, 36), (156, 100, 56)]
BRANCO = (255, 255, 240)
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def estrela(cx, cy, r_fora, r_dentro):
    ang = np.arctan2(b.py - cy, b.px - cx) + np.pi / 2
    k = (ang % (2 * np.pi / 5)) / (2 * np.pi / 5)
    raio = r_dentro + (r_fora - r_dentro) * np.abs(1 - 2 * k)
    return np.hypot(b.px - cx, b.py - cy) <= raio


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 10):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def chapeu():
    # o cone: largo como a cabeça embaixo, afinando para cima e tombando a ponta para a direita
    cone = tubo([(31.5, 10, 19.0), (31.5, 4, 13.5), (32, -3, 9.0), (35, -9, 5.5), (40, -13, 3.2), (46, -13, 1.8),
                 (49, -10, 1.2)])
    cone = np.maximum(cone, b.py - 14)
    m, _ = b.peca("chapeu", cone, ROXO, 3.5, cortes=CORTES, linha=ROXO[0])
    # a faixa de ouro na base do cone
    faixa = m & (b.yy >= 6) & (b.yy <= 9)
    b.pintar(faixa & (b.yy == 6), OURO[1])
    b.pintar(faixa & (b.yy == 7), OURO[4])
    b.pintar(faixa & (b.yy == 8), OURO[3])
    b.pintar(faixa & (b.yy == 9), OURO[1])
    b.escurecer(faixa & (np.abs(b.px - 31.5) > 15), OURO)
    # a estrela grande de ouro no meio do cone e estrelinhas espalhadas
    st = estrela(31.5, -1.5, 4.4, 1.9)
    b.contorno(st, "estrela", OURO[0])
    b.pintar(st, OURO[3])
    b.pintar(st & (b.px < 31.5) & (b.py < -1), OURO[5])
    b.pintar(st & (b.px >= 31.5) & (b.py >= -1), OURO[2])
    for x, y in ((24, 3), (39, 2), (35, -8), (26, -4)):
        b.ponto(x, y, OURO[4])
    # a aba: um disco largo e achatado, passando das orelhas
    aba = b.bola(31.5, 14.0, 31.0, 3.6)
    am, _ = b.peca("chapeu", aba, ROXO, 1.8, cortes=CORTES, linha=ROXO[0])
    b.trocar(am & ~np.roll(am, -1, 0), ROXO, [ROXO[0]] * 6)   # a beira de baixo, na sombra
    b.escurecer(am & (np.abs(b.px - 31.5) > 26), ROXO)
    # sombra da aba na testa
    for y, passos in ((18, 2), (19, 1), (20, 1)):
        sombra = (b.yy == y) & (b.peca_de == "cabeca")
        b.escurecer(sombra, b.BROWNIE, passos)
        b.escurecer(sombra, b.CALDA, passos)


def tunica():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ROXO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.escurecer(corpo & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), ROXO)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ROXO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, OURO)
    # a gola em V com barrado de ouro
    for y in range(42, 48):
        meia = 6 - (y - 42)
        b.ponto(int(31.5 - meia), y, OURO[4]); b.ponto(int(31.5 + meia) + 1, y, OURO[3])
    # o barrado de ouro na barra da túnica, dando a volta
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 58, OURO, None, livre)
    # estrelinhas e luas bordadas
    for x, y in ((21, 47), (42, 46), (25, 54), (39, 53), (32, 51)):
        b.ponto(x, y, OURO[4])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            b.ponto(x + dx, y + dy, OURO[2])


def varinha():
    """a varinha na mão direita: um pau de madeira em diagonal com a estrela brilhando na ponta"""
    for i in range(10):
        x, y = 50 + i * 0.7, 54 - i
        xi, yi = int(round(x)), int(round(y))
        b.ponto(xi - 1, yi, MADEIRA[0]); b.ponto(xi + 1, yi, MADEIRA[0])
        b.ponto(xi, yi, MADEIRA[3] if i % 3 == 0 else MADEIRA[2])
    st = estrela(57.5, 42.0, 3.6, 1.5)
    b.contorno(st, "varinha", OURO[0])
    b.pintar(st, OURO[4])
    b.pintar(st & (b.px >= 57.5) & (b.py >= 42), OURO[3])
    b.ponto(57, 41, BRANCO)
    # o brilho mágico em volta
    for x, y in ((62, 38), (53, 37), (63, 45), (60, 35)):
        b.ponto(x, y, OURO[5])
    b.ponto(52, 37, OURO[3]); b.ponto(54, 37, OURO[3]); b.ponto(53, 36, OURO[3]); b.ponto(53, 38, OURO[3])


if __name__ == "__main__":
    b.desenhar()
    tunica()
    varinha()
    chapeu()
    b.img[b.peca_de == "orelha", 3] = 0   # o chapéu cobre as orelhas
    b.conferencia("browmago")
