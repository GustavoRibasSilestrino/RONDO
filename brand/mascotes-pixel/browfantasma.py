"""Browfantasma (incomum, linha 1, coluna 4): fantasia de fantasminha. Um lençol branco cobre o brownie inteiro, até os
pés, com a cabeça arredondada, os bracinhos marcados por baixo do pano, as dobras caindo e a barra ondulada; só os olhos
aparecem, em dois buracos recortados no pano.  python browfantasma.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

LENCOL = [(96, 92, 132), (150, 146, 186), (200, 198, 228), (232, 230, 246), (248, 247, 253), (255, 255, 255)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def lencol():
    # a forma do lençol: a cabeça arredondada, o corpo caindo e alargando até embaixo, e os bracinhos por baixo do pano
    cabeca = b.caixa(8, 5, 55, 44, 13)
    saia = b.caixa(10, 30, 53, 73, 6)
    bracos = np.minimum(b.bola(12.5, 50.0, 5.0, 6.5), b.bola(50.5, 50.0, 5.0, 6.5))   # espelhados em volta de 31.5
    forma = np.minimum(np.minimum(cabeca, saia), bracos)
    # a barra ondulada (as pontas do pano caindo), comprida o bastante para cobrir os pés
    barra = b.py - (70.5 + 1.6 * np.cos((b.px - 31.5) * 0.62))
    forma = np.maximum(forma, barra)
    # só dois buracos no pano, um em cada olho
    abertura = np.minimum(b.bola(22.5, 28.5, 4.6, 5.6), b.bola(41.5, 28.5, 4.6, 5.6))
    d = np.maximum(forma, -abertura)
    m, _ = b.peca("lencol", d, LENCOL, 5.0, cortes=CORTES, linha=LENCOL[0])
    # as dobras do pano: vincos suaves descendo do ombro até a barra, simétricos
    for x0, curva in ((21.0, -0.06), (42.0, 0.06), (27.0, -0.02), (36.0, 0.02)):
        for y in range(46, 70):
            x = int(round(x0 + curva * (y - 46) ** 1.3))
            if m[y + b.OY, x + b.OX] and m[y + b.OY + 1, x + b.OX]:
                b.ponto(x, y, LENCOL[2])
                b.ponto(x - 1 if x < 32 else x + 1, y, LENCOL[4])
    # a sombra embaixo dos bracinhos e entre eles e o corpo
    for cx in (12.5, 50.5):
        b.escurecer(m & (b.bola(cx, 51.5, 5.4, 6.8) > 0) & (b.bola(cx, 51.5, 6.2, 7.6) <= 0) & (b.py > 52), LENCOL)
    # a beira dos buracos: o pano tem espessura (um tom mais claro); dentro é escuro em volta do olho, como quem
    # espia de dentro do lençol
    b.clarear(m & (abertura <= 1.2), LENCOL)
    dentro = (abertura <= 0) & (b.peca_de == "cabeca")
    olho = np.zeros(b.img.shape[:2], bool)
    for c in b.OLHO + [b.BRANCO]:
        olho |= np.all(b.img[..., :3] == c, axis=2)
    b.pintar(dentro & ~olho, (34, 20, 30))
    # um brilho de tecido no alto da cabeça
    for x, y in ((16, 9), (17, 8), (18, 8), (19, 8), (16, 10)):
        b.ponto(x, y, LENCOL[5])


if __name__ == "__main__":
    b.desenhar()
    b.img[b.peca_de == "orelha", 3] = 0   # o lençol cobre as orelhas
    lencol()
    b.conferencia("browfantasma")
