"""Browdivino (lendário, linha 4, coluna 3): o browniezinho todo de ouro, com calda de mel, auréola flutuando, asas de
penas douradas atrás do corpo, uma joia de sol no peito e brilhos em volta.  python browdivino.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

CORPO_OURO = [(92, 44, 8), (150, 84, 14), (204, 128, 24), (238, 172, 40), (252, 208, 84), (255, 240, 170)]
MEL = [(64, 26, 4), (112, 52, 6), (164, 84, 8), (206, 116, 14), (240, 160, 40), (255, 236, 190)]
ASA = [(120, 70, 12), (178, 118, 26), (226, 170, 52), (248, 210, 104), (255, 236, 168), (255, 252, 230)]
AUREOLA = [(130, 74, 8), (196, 128, 18), (240, 178, 36), (255, 214, 80), (255, 240, 160), (255, 255, 236)]
BRANCO = (255, 255, 244)


def asas():
    """asas de anjo de penas douradas (as mesmas da base, com a rampa de ouro claro)"""
    b.asas_de_penas(ASA, centro=32)


def aureola():
    """o anel de luz flutuando acima da cabeça, mais grosso na frente"""
    cx, cy = 32, -9
    fora = b.bola(cx, cy, 13.5, 4.2)
    dentro = b.bola(cx, cy - 0.6, 10.0, 2.2)
    d = np.maximum(fora, -dentro)
    b.peca("aureola", d, AUREOLA, 1.6, cortes=(0.3, 0.45, 0.6, 0.72, 0.93), linha=AUREOLA[1])
    # reflexos: um risco branco na frente à esquerda e um ponto atrás à direita
    for x in range(23, 29):
        b.ponto(x, -6, BRANCO if 24 <= x <= 26 else AUREOLA[5])
    b.ponto(39, -12, AUREOLA[5]); b.ponto(40, -12, AUREOLA[5])


def joia_sol():
    """uma joia de sol no peito: um diamante branco com raios de ouro"""
    cx, cy = 32, 50
    for dx, dy in ((0, -4), (0, 4), (-4, 0), (4, 0), (-3, -3), (3, -3), (-3, 3), (3, 3)):
        b.ponto(cx + dx, cy + dy, CORPO_OURO[5] if dy <= 0 else CORPO_OURO[4])
    diamante = (np.abs(b.xx - cx) + np.abs(b.yy - cy)) <= 2.5
    borda = (np.abs(b.xx - cx) + np.abs(b.yy - cy) > 1.5) & diamante
    b.pintar(diamante, (196, 236, 255))
    b.pintar(borda & (b.yy >= cy) | borda & (b.xx > cx), (110, 170, 230))
    b.pintar(borda & (b.yy < cy) & (b.xx <= cx), (236, 250, 255))
    b.ponto(cx - 1, cy - 1, BRANCO)


def brilho(x, y, tam=2):
    """uma estrelinha de 4 pontas"""
    b.ponto(x, y, BRANCO)
    for k in range(1, tam + 1):
        cor = AUREOLA[4] if k == 1 else AUREOLA[3]
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            b.ponto(x + dx, y + dy, cor)


if __name__ == "__main__":
    b.BROWNIE = CORPO_OURO
    b.CALDA = MEL
    b.desenhar(atras=asas)
    joia_sol()
    with b.deslocado(b.CABECA_DESCE):
        aureola()
    for x, y, t in ((-2, 6, 2), (65, 2, 2), (66, 26, 1), (-4, 30, 1), (62, 62, 2), (1, 66, 1), (46, -14, 1)):
        brilho(x, y, t)
    b.conferencia("browdivino")
