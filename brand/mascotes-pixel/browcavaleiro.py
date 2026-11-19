"""Browcavaleiro (incomum, linha 1, coluna 9): o cavaleiro. Elmo de aço com a viseira de grade levantada acima dos olhos
(o rosto fica à mostra numa abertura de cantos arredondados), a crista no meio, os rebites dos lados e a pluma vermelha
em cima; armadura de placas no peito, ombreiras, manoplas e grevas, cinturão de couro com fivela de ouro, a capa
vermelha por trás e o escudo com a cruz de ouro no braço.  python browcavaleiro.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ACO = [(44, 50, 74), (86, 94, 124), (136, 146, 178), (184, 192, 220), (220, 226, 246), (250, 252, 255)]
VERMELHO = [(64, 8, 14), (120, 18, 26), (172, 30, 36), (210, 50, 50), (238, 90, 80), (252, 140, 120)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
COURO = [(40, 22, 14), (70, 40, 24), (100, 60, 34), (130, 82, 46), (160, 108, 62), (190, 140, 90)]
FRESTA = (20, 22, 36)
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def capa():
    """a capa vermelha caindo por trás, aparecendo dos lados do corpo e embaixo"""
    d = b.caixa(12, 40, 51, 66, 4)
    m, _ = b.peca("capa", d, VERMELHO, 3.0, cortes=CORTES, linha=VERMELHO[0])
    for x in (14, 49):   # as dobras do pano, espelhadas
        for y in range(46, 66):
            b.ponto(x, y, VERMELHO[1])


def pluma():
    """a pluma vermelha saindo do alto do elmo, num suporte de ouro"""
    d = np.minimum(np.minimum(b.bola(MEIO, 0.0, 6.0, 4.5), b.bola(MEIO - 4.5, 3.0, 3.6, 3.0)),
                   b.bola(MEIO + 4.5, 3.0, 3.6, 3.0))
    m, _ = b.peca("pluma", b.felpudo(d, 0.7), VERMELHO, 2.5, cortes=CORTES, linha=VERMELHO[0])
    b.tufos(m, VERMELHO, 9, 0.1)


def elmo():
    abertura = b.caixa(16, 21, 47, 40, 4)
    d = np.maximum(b.caixa(9, 4, 54, 44, 10), -abertura)
    m, _ = b.peca("elmo", d, ACO, 4.0, cortes=CORTES, linha=ACO[0])
    # a viseira de grade, levantada em cima dos olhos: uma placa com as frestas verticais, espelhadas
    viseira = (b.caixa(15, 8, 48, 20, 3) <= 0) & m
    b.clarear(viseira, ACO)
    borda = viseira & ~(np.roll(viseira, 1, 0) & np.roll(viseira, -1, 0) & np.roll(viseira, 1, 1) & np.roll(viseira, -1, 1))
    b.pintar(borda, ACO[1])
    b.pintar(borda & (b.py < 9.5) & (b.px > 17) & (b.px < 47), ACO[5])
    for x in (19, 22, 25, 28):
        for xx in (x, 63 - x):
            for y in range(11, 18):
                b.ponto(xx, y, FRESTA)
            b.ponto(xx + (1 if xx < 32 else -1), 11, ACO[2])
    # a crista no meio, de cima até a viseira
    for y in range(5, 8):
        b.ponto(31, y, ACO[5]); b.ponto(32, y, ACO[2])
    for x in range(29, 35):   # o suporte de ouro da pluma
        b.ponto(x, 4, OURO[4] if x < 32 else OURO[2])
        b.ponto(x, 5, OURO[1])
    # os rebites dos lados, espelhados
    for x, y in ((12, 26), (12, 34)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, ACO[5]); b.ponto(xx, y + 1, ACO[1])
    # a beira da abertura brilha (o metal tem espessura) e joga sombra no rosto
    b.clarear(m & (abertura <= 1.6) & ~viseira, ACO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def armadura():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ACO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a placa do peito: o vinco no meio e as juntas das lâminas embaixo
    for y in range(45, 54):
        b.ponto(31, y, ACO[1]); b.ponto(32, y, ACO[4])
    for y in (51,):
        b.escurecer(corpo & (b.yy == y) & (b.px > 18) & (b.px < 46), ACO)
    for x, y in ((20, 44), (20, 49)):   # rebites do peito, espelhados
        for xx in (x, 63 - x):
            b.ponto(xx, y, ACO[5])
    # as grevas
    for x0 in (21, 35):
        m = b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ACO, 2.5)
        b.escurecer(m & (b.yy == 63), ACO)
    # os braços de aço com as manoplas e as ombreiras arredondadas por cima
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ACO, 3.0)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, ACO)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    # o cinturão de couro com a fivela de ouro
    b.faixa_envolvente(d_corpo <= 0, 55, COURO, None, livre)
    for x in range(29, 35):
        for y in range(54, 59):
            borda = x in (29, 34) or y in (54, 58)
            if borda:
                b.ponto(x, y, OURO[3] if (x < 32 and y < 56) else OURO[1])
            else:
                b.ponto(x, y, COURO[1])
    b.ponto(31, 56, OURO[4]); b.ponto(32, 56, OURO[2])
    for cx in (14.5, 49.5):
        b.peca("ombreira", b.bola(cx, 43.0, 5.4, 3.4), ACO, 2.0, cortes=CORTES, linha=ACO[0])
        for dx in (-2, 0, 2):
            b.ponto(int(cx) + dx, 44, ACO[1])


def escudo():
    """o escudo no braço esquerdo: aço na beira, campo vermelho e a cruz de ouro, simétrico nele mesmo"""
    cx = 12.0
    t = (b.py - 47.0) / 13.0
    meia = np.where(t < 0.45, 6.5, 6.5 * np.sqrt(np.clip(1 - ((t - 0.45) / 0.55) ** 2, 0, 1)))
    d = np.maximum(np.maximum(np.abs(b.px - cx) - meia, 47.0 - b.py), b.py - 60.0)
    m, _ = b.peca("escudo", d, ACO, 1.6, cortes=CORTES, linha=ACO[0])
    campo = m & (d <= -1.2)
    b.pintar(campo, VERMELHO[2])
    b.pintar(campo & (b.px < cx) & (b.py < 52), VERMELHO[3])
    for y in range(49, 58):   # a cruz de ouro
        b.ponto(11, y, OURO[4]); b.ponto(12, y, OURO[2])
    for x in range(8, 16):
        b.ponto(x, 51, OURO[4] if x < 12 else OURO[3]); b.ponto(x, 52, OURO[2] if x < 12 else OURO[1])


if __name__ == "__main__":
    b.desenhar(atras=capa)
    armadura()
    b.img[b.peca_de == "orelha", 3] = 0   # o elmo cobre as orelhas
    pluma()
    elmo()
    escudo()
    b.conferencia("browcavaleiro")
