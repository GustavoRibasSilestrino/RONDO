"""Browdelegado (incomum, linha 1, coluna 1): o delegado, o chefe da polícia. Quepe de oficial azul-marinho, mais alto que
o do policial, com a estrela de ouro entre louros e o galão dourado na pala; farda azul-marinho com dragonas de ouro e
franjas nos ombros, a estrela de delegado no peito, a barreta de condecorações, botões de ouro e o cinturão preto com
fivela de prata.  python browdelegado.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

AZUL = [(8, 12, 36), (16, 24, 66), (26, 38, 102), (38, 56, 140), (62, 86, 180), (112, 140, 222)]
PRETO = [(6, 6, 10), (16, 16, 24), (30, 30, 42), (52, 52, 68), (96, 96, 116), (190, 190, 210)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
LOURO = [(40, 70, 20), (80, 120, 36), (130, 170, 60)]
PRATA = [(70, 74, 88), (130, 136, 152), (196, 200, 214), (244, 246, 252)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
BRANCO = (255, 255, 244)


def estrela(cx, cy, r_fora, r_dentro):
    ang = np.arctan2(b.py - cy, b.px - cx) + np.pi / 2
    k = (ang % (2 * np.pi / 5)) / (2 * np.pi / 5)
    raio = r_dentro + (r_fora - r_dentro) * np.abs(1 - 2 * k)
    return np.hypot(b.px - cx, b.py - cy) <= raio


def estrela_de_ouro(cx, cy, r_fora, r_dentro):
    m = estrela(cx, cy, r_fora, r_dentro)
    b.contorno(m, "estrela", OURO[0])
    b.pintar(m, OURO[3])
    b.pintar(m & (b.px < cx) & (b.py < cy + 0.5), OURO[5])
    b.pintar(m & (b.px >= cx) & (b.py >= cy + 0.5), OURO[2])
    return m


def quepe():
    # a copa alta e larga de oficial
    b.peca("quepe", b.bola(31.5, 2.0, 17.0, 7.0), AZUL, 3.0, cortes=CORTES, linha=AZUL[1])
    for x in range(21, 30):
        b.ponto(x, -3, AZUL[5])
    # o aro escuro com o cordão de ouro duplo
    b.peca("quepe", b.caixa(18, 6, 45, 14, 2), [AZUL[0], AZUL[1], AZUL[1], AZUL[2], AZUL[3], AZUL[4]], 2.0,
           cortes=CORTES, linha=AZUL[0])
    for x in range(19, 45):
        b.ponto(x, 11, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 13, OURO[2])
    for x in (19, 44):
        b.ponto(x, 12, OURO[5])
    # a estrela de ouro entre dois ramos de louro
    estrela_de_ouro(31.5, 6.5, 4.6, 2.0)
    for lado in (-1, 1):
        for i, (dx, dy) in enumerate(((6, 9), (7, 8), (8, 7), (9, 6), (9, 5))):
            x = int(31.5 + lado * dx - (1 if lado < 0 else 0))
            b.ponto(x, dy, LOURO[2] if i % 2 == 0 else LOURO[1])
            b.ponto(x + lado, dy + 1, LOURO[0])
    # a pala preta com o galão dourado em zigue-zague
    pala = np.maximum(b.bola(31.5, 14.5, 14.0, 3.6), 14.5 - b.py)
    b.peca("quepe", pala, PRETO, 1.6, cortes=CORTES, linha=PRETO[0])
    for x in range(20, 44):
        b.ponto(x, 15 + (x % 2), OURO[3] if x < 32 else OURO[2])
    for x in range(22, 27):
        b.ponto(x, 17, PRETO[4])
    for y, passos in ((18, 2), (19, 1)):
        sombra = (b.yy == y) & (b.peca_de == "cabeca") & (np.abs(b.px - 31.5) < 15)
        b.escurecer(sombra, b.BROWNIE, passos)
        b.escurecer(sombra, b.CALDA, passos)


def farda():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, AZUL, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.escurecer(corpo & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), AZUL)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), AZUL, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 50, OURO, (AZUL[3], AZUL[1]))
    # a abertura da farda no meio, com os botões de ouro
    for y in range(44, 56):
        b.ponto(31, y, AZUL[1]); b.ponto(32, y, AZUL[1])
    for y in (46, 50):
        b.ponto(30, y, OURO[4]); b.ponto(33, y, OURO[3]); b.ponto(30, y + 1, OURO[1]); b.ponto(33, y + 1, OURO[1])
    # o cinturão preto com fivela de prata
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 56, PRETO, None, livre)
    for x in range(29, 35):
        for y in range(55, 60):
            borda = x in (29, 34) or y in (55, 59)
            b.ponto(x, y, PRATA[0] if borda else (PRATA[3] if (x, y) == (30, 56) else PRATA[2] if x < 32 else PRATA[1]))
    # a estrela de delegado no peito e a barreta de condecorações do outro lado
    estrela_de_ouro(23.5, 48.5, 4.0, 1.8)
    b.ponto(22, 46, BRANCO)
    fitas = [(220, 40, 40), (40, 160, 70), (250, 200, 50), (60, 110, 220)]
    for i, cor in enumerate(fitas):
        for y in (46, 47):
            b.ponto(37 + i, y, cor)
    for x in range(36, 42):
        b.ponto(x, 45, AZUL[0]); b.ponto(x, 48, AZUL[0])
    b.ponto(36, 46, AZUL[0]); b.ponto(36, 47, AZUL[0]); b.ponto(41, 46, AZUL[0]); b.ponto(41, 47, AZUL[0])


def dragonas():
    """as dragonas de ouro em cima dos ombros, com as franjas caindo"""
    for x0, x1 in ((11, 18), (45, 52)):   # espelhadas em volta de x = 31.5
        d = b.caixa(x0, 42, x1, 44, 1)
        m, _ = b.peca("dragona", d, OURO, 1.0, cortes=CORTES, linha=OURO[0])
        for x in range(x0, x1 + 1):   # as franjas: fios alternados
            if (x - x0) % 2 == 0:
                b.ponto(x, 45, OURO[3]); b.ponto(x, 46, OURO[1])
        b.ponto(x0 + 1, 42, OURO[5])


if __name__ == "__main__":
    b.desenhar()
    farda()
    dragonas()
    quepe()
    b.conferencia("browdelegado")
