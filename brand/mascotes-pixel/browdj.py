"""BrowDJ (comum, linha 0, coluna 5): o DJ. Touca de lã roxa com pompom; fone de ouvido grande roxo, com o arco passando por cima da cabeça e das
orelhas, conchas grossas com almofada e luz de neon; moletom roxo liso com estrelinhas, e corrente de ouro com uma nota
musical de pingente.  python browdj.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ROXO = [(30, 10, 52), (58, 20, 96), (92, 36, 142), (126, 56, 186), (164, 96, 224), (206, 152, 250)]
GRAFITE = [(14, 10, 22), (28, 20, 40), (46, 34, 62), (70, 54, 92), (104, 84, 130), (150, 130, 180)]
NEON = [(196, 60, 230), (240, 120, 255), (255, 200, 255), (255, 244, 255)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
LARANJA = [(200, 80, 30), (252, 150, 60)]
TOUCA = [(44, 8, 60), (80, 18, 104), (118, 34, 150), (152, 54, 190), (186, 92, 222), (222, 150, 246)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def fone():
    # o arco: meia-lua grossa por cima da cabeça e das orelhas, de uma concha à outra
    arco = np.maximum(np.maximum(b.bola(31.5, 25, 24.0, 23.0), -b.bola(31.5, 25, 20.5, 19.5)), b.py - 24)
    m, _ = b.peca("fone", arco, ROXO, 1.8, cortes=CORTES, linha=ROXO[0])
    # o acolchoado de baixo do arco, mais escuro, e as luzinhas de neon no alto
    dentro = m & (b.bola(31.5, 25, 21.6, 20.6) <= 0)
    b.pintar(dentro, GRAFITE[2])
    for x in (25, 31, 32, 38):
        b.ponto(x, 2 + (0 if x in (31, 32) else 1 if x in (25, 38) else 0), NEON[2])
    # as conchas: grossas, dos lados da cabeça, espelhadas (a tela é simétrica em volta de x = 31.5), com a almofada
    # encostando na cabeça
    for x0, x1, a0, a1, luz in ((4, 12, 11, 14, 8), (51, 59, 49, 52, 55)):
        b.peca("fone", b.caixa(a0, 20, a1, 34, 2), GRAFITE, 1.6, cortes=CORTES, linha=GRAFITE[0])   # a almofada
        b.peca("fone", b.caixa(x0, 18, x1, 36, 4), ROXO, 2.4, cortes=CORTES, linha=ROXO[0])
        # a luz de neon: uma faixa vertical de 2 pixels no meio da concha, mais forte no centro
        for y in range(21, 34):
            forte = 24 <= y <= 30
            for x in (luz, luz + 1):
                b.ponto(x, y, NEON[3] if forte else NEON[2])
            b.ponto(luz - 1, y, NEON[1] if forte else NEON[0])
            b.ponto(luz + 2, y, NEON[1] if forte else NEON[0])
        b.ponto(luz, 20, NEON[0]); b.ponto(luz + 1, 20, NEON[0])
        b.ponto(luz, 34, NEON[0]); b.ponto(luz + 1, 34, NEON[0])


def touca():
    """a touca de lã roxa: a copa cobre o alto da cabeça e as orelhas, com as nervuras do
    tricô, e a barra dobrada dá a volta na testa"""
    copa = np.maximum(b.bola(31.5, 15, 21.0, 11.0), b.py - 17)
    m, _ = b.peca("touca", copa, TOUCA, 3.0, cortes=CORTES, linha=TOUCA[0])
    for x in range(14, 51, 3):   # nervuras do tricô descendo
        b.escurecer(m & (b.xx == x) & (b.yy > 6), TOUCA)
    # a barra dobrada, um pixel para fora da cabeça dos dois lados, com as nervuras mais marcadas
    barra = b.caixa(10, 15, 53, 20, 2)
    bm, _ = b.peca("touca", barra, TOUCA, 1.6, cortes=CORTES, linha=TOUCA[0])
    for x in range(11, 53, 2):
        b.escurecer(bm & (b.xx == x), TOUCA)
    b.escurecer(bm & ((b.xx <= 11) | (b.xx >= 52)), TOUCA)
    # sombra da touca na testa
    sombra = (b.yy == 21) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def pompom():
    """o pompom de lã no alto, por cima do arco do fone, com fiapos"""
    d = b.bola(31.5, -1.5, 4.2, 3.8)
    m, _ = b.peca("touca", d, TOUCA, 2.5, cortes=CORTES, linha=TOUCA[0])
    for x, y in ((29, -3), (33, -2), (31, 0), (30, -1), (34, 0), (28, 0)):
        b.ponto(x, y, TOUCA[2])
    for x, y in ((29, -4), (30, -4), (32, -3)):
        b.ponto(x, y, TOUCA[5])


def moletom():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ROXO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.escurecer(corpo & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), ROXO)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ROXO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, ROXO)   # o punho do moletom
    # estrelinhas laranja estampadas
    for x, y in ((21, 56), (42, 49), (40, 58), (24, 50)):
        b.ponto(x, y, LARANJA[1])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            b.ponto(x + dx, y + dy, LARANJA[0])


def corrente():
    # a corrente de ouro em V, de elo em elo (claro, escuro), até o pingente
    for lado in (-1, 1):
        for i in range(8):
            x = int(31.5 + lado * (9 - i)) + (1 if lado > 0 else 0)
            y = 43 + i * 0.75
            b.ponto(x, int(y), OURO[4] if i % 2 == 0 else OURO[2])
    # o pingente: uma nota musical de ouro (colcheia)
    nota = [(32, 50), (32, 51), (32, 52), (32, 53), (32, 54), (33, 50), (34, 51), (34, 52),
            (30, 54), (31, 54), (30, 55), (31, 55), (29, 55), (30, 56), (31, 56)]
    contorno = set()
    for x, y in nota:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                contorno.add((x + dx, y + dy))
    for x, y in contorno - set(nota):
        b.ponto(x, y, OURO[0])
    for x, y in nota:
        b.ponto(x, y, OURO[4] if x <= 31 or y <= 51 else OURO[3])
    b.ponto(30, 55, OURO[5])


if __name__ == "__main__":
    b.desenhar()
    moletom()
    corrente()
    touca()
    fone()
    pompom()
    # a touca esconde as orelhas: some o que sobrou delas para fora
    b.img[b.peca_de == "orelha", 3] = 0
    b.conferencia("browdj")
