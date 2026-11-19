"""Browabóbora (incomum, linha 1, coluna 3): fantasia de abóbora de Halloween. A cabeça vira uma abóbora laranja com os
gomos, o cabinho verde, uma folha e uma gavinha enrolada, e o rosto aparece numa abertura cortada (com a polpa amarela na
beira); suéter roxo-escuro listrado de laranja e um baldinho de abóbora cheio de doces na mão.  python browabobora.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

LARANJA = [(96, 30, 6), (156, 58, 10), (206, 90, 16), (238, 124, 28), (252, 162, 56), (255, 204, 120)]
POLPA = [(220, 150, 40), (250, 200, 80), (255, 230, 140)]
VERDE = [(20, 50, 14), (40, 90, 24), (70, 130, 40), (110, 170, 60), (160, 210, 90), (210, 240, 150)]
ROXO = [(20, 8, 30), (40, 16, 58), (64, 28, 90), (88, 42, 120), (120, 66, 156), (160, 110, 196)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def abobora():
    cx, cy, rx, ry = 31.5, 22.0, 27.0, 21.0
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.bola(cx, cy, rx, ry), -abertura)
    m, _ = b.peca("abobora", d, LARANJA, 5.0, cortes=CORTES, linha=LARANJA[0])
    # os gomos: as divisas curvas descem do cabinho até embaixo, e o meio de cada gomo é mais claro
    larg = rx * np.sqrt(np.clip(1 - ((b.py - cy) / ry) ** 2, 0.02, 1))
    u = (b.px - cx) / larg
    for divisa in (-0.68, -0.32, 0.32, 0.68):
        b.escurecer(m & (np.abs(u - divisa) < 0.035 + 0.02 / larg * 8), LARANJA)
    for meio in (-0.84, -0.5, 0.0, 0.5, 0.84):
        b.clarear(m & (np.abs(u - meio) < 0.05) & (b.py < cy) & (b.py > 4), LARANJA)
    # a beira do corte: a polpa amarela aparecendo, e a sombra dentro, no rosto
    beira = m & (abertura <= 1.5)
    b.pintar(beira, POLPA[1])
    b.pintar(beira & (abertura > 0.8), POLPA[2])
    b.pintar(beira & (b.py > 35), POLPA[0])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def cabinho():
    # o cabinho verde, grosso e um pouco torto, saindo do meio do alto
    for y in range(-4, 3):
        x0 = 30 + (1 if y < -1 else 0)
        for x in range(x0, x0 + 4):
            b.ponto(x, y, VERDE[3] if x == x0 else VERDE[2] if x < x0 + 3 else VERDE[1])
        b.ponto(x0 - 1, y, VERDE[0]); b.ponto(x0 + 4, y, VERDE[0])
    for x in range(30, 35):
        b.ponto(x, -5, VERDE[0])
    b.ponto(31, -4, VERDE[4]); b.ponto(32, -4, VERDE[4])
    # a folha para a direita, com a nervura
    folha = b.bola(40.0, -1.0, 5.5, 2.6)
    fm, _ = b.peca("folha", folha, VERDE, 1.4, cortes=CORTES, linha=VERDE[0])
    for x in range(36, 44):
        b.ponto(x, -1, VERDE[2])
    # a gavinha enrolada para a esquerda
    for x, y in ((29, 0), (28, -1), (27, -2), (26, -2), (25, -1), (25, 0), (26, 1), (27, 0)):
        b.ponto(x, y, VERDE[3])


def sueter():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ROXO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # listras laranja de 2 pixels
    listra = corpo & ((b.yy - 46) % 5 < 2) & (b.yy >= 46)
    b.trocar(listra, ROXO, LARANJA)
    for cx in (14.5, 49.5):
        m = b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ROXO, 3.0, onde=b.yy <= 52)
        b.trocar(m & ((b.yy - 46) % 5 < 2), ROXO, LARANJA)


def baldinho():
    """o baldinho de abóbora na mão direita, com alça e doces aparecendo"""
    d = np.maximum(b.bola(52.5, 59.0, 5.0, 4.2), 55.5 - b.py)
    m, _ = b.peca("balde", d, LARANJA, 2.0, cortes=CORTES, linha=LARANJA[0])
    # a carinha de abóbora recortada no balde
    for x, y in ((50, 58), (51, 58), (54, 58), (55, 58), (50, 60), (51, 61), (52, 61), (53, 61), (54, 61), (55, 60)):
        b.ponto(x, y, LARANJA[0])
    # os doces aparecendo na boca do balde
    for x, y, c in ((49, 54, (230, 60, 80)), (50, 54, (230, 60, 80)), (52, 53, (90, 200, 120)), (53, 53, (90, 200, 120)),
                    (55, 54, (250, 220, 70)), (56, 54, (250, 220, 70)), (51, 55, (120, 90, 230)), (54, 55, (240, 240, 250))):
        b.ponto(x, y, c)
    # a alça preta passando pela mão
    for x, y in ((48, 55), (48, 54), (49, 52), (50, 51), (52, 51), (53, 51), (55, 52), (56, 53), (57, 55)):
        b.ponto(x, y, ROXO[0])


if __name__ == "__main__":
    b.desenhar()
    sueter()
    b.img[b.peca_de == "orelha", 3] = 0   # a abóbora cobre as orelhas
    abobora()
    cabinho()
    baldinho()
    b.conferencia("browabobora")
