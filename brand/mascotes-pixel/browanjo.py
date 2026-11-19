"""Browanjo (comum, linha 0, coluna 6): o anjinho, todo branco (bolo branco e calda de chocolate branco). Auréola de
ouro flutuando, asas de penas brancas, gola de babado que dá a volta no pescoço.  python browanjo.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402
import browdivino as dv  # noqa: E402

PENA = [(110, 100, 150), (160, 152, 196), (204, 200, 230), (232, 230, 246), (248, 247, 253), (255, 255, 255)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
# o anjinho é todo branco: bolo branco com sombras lilás e calda de chocolate branco
CORPO_BRANCO = [(118, 108, 140), (174, 166, 196), (216, 212, 232), (240, 238, 249), (251, 250, 255), (255, 255, 255)]
CHOCOLATE_BRANCO = [(116, 96, 76), (168, 148, 122), (212, 196, 170), (236, 226, 204), (250, 244, 228), (255, 255, 248)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def asas():
    b.asas_de_penas(PENA, centro=31.5, escala=0.9)


def gola():
    """a gola de babado dá a volta no pescoço: as ondas seguem uma curva (descem no meio do peito e sobem nos ombros), vão
    de um lado ao outro do corpo passando por cima dos ombros, e as das pontas são menores e mais escuras, virando para
    trás"""
    babado = b.caixa(15, 41, 48, 43, 2)
    ondas = [31.5 + k * 3.6 for k in range(-4, 5)]
    for x in ondas:
        t = (x - 31.5) / 16.5
        y = 43.6 + 1.6 * (1 - t * t)
        r = 2.4 if abs(t) < 0.8 else 2.0
        babado = np.minimum(babado, b.bola(x, y, r, r - 0.1))
    m, _ = b.peca("gola", babado, PENA, 1.4, cortes=CORTES, linha=PENA[1])
    b.escurecer(m & (np.abs(b.px - 31.5) > 12.5), PENA)          # as pontas viram para trás
    b.escurecer(m & (np.abs(b.px - 31.5) > 15.0), PENA)
    # um barrado fino de ouro na beira de baixo das ondas, para a gola se separar do corpo branco
    beira = m & ~np.roll(m, -1, 0)
    b.pintar(beira, OURO[3])
    b.pintar(beira & (np.abs(b.px - 31.5) > 12.5), OURO[2])
    b.pintar(beira & (b.px < 31.5) & (np.abs(b.px - 31.5) < 9), OURO[4])
    # os vincos entre as ondas
    for x in ondas[:-1]:
        xm = int(x + 1.8)
        t = (xm + 0.5 - 31.5) / 16.5
        b.ponto(xm, int(43.6 + 1.6 * (1 - t * t)) + 1, PENA[2])


if __name__ == "__main__":
    b.BROWNIE = CORPO_BRANCO
    b.CALDA = CHOCOLATE_BRANCO
    b.desenhar(atras=asas)
    gola()
    with b.deslocado(b.CABECA_DESCE):
        dv.aureola()
    b.conferencia("browanjo")
