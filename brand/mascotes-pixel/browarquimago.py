"""Browarquimago (épico, linha 3, coluna 7): o arquimago. Chapéu alto e reto azul-meia-noite com a aba larga, a faixa de
ouro com as runas e a estrela de ouro na ponta; o monóculo dourado com a correntinha; o manto azul-meia-noite
com a gola de ouro em V, as constelações bordadas e o broche de lua; o círculo mágico dourado com as runas girando por
trás e as duas esferas de magia orbitando.  python browarquimago.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

NOITE = [(8, 8, 34), (18, 20, 70), (30, 36, 110), (46, 56, 150), (70, 84, 190), (110, 126, 226)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
MAGIA = [(60, 20, 120), (130, 60, 220), (190, 130, 255), (240, 220, 255)]
BRANCO = (255, 255, 244)
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def estrela(cx, cy, r_fora, r_dentro):
    ang = np.arctan2(b.py - cy, b.px - cx) + np.pi / 2
    k = (ang % (2 * np.pi / 5)) / (2 * np.pi / 5)
    raio = r_dentro + (r_fora - r_dentro) * np.abs(1 - 2 * k)
    return np.hypot(b.px - cx, b.py - cy) <= raio


def circulo():
    """o círculo mágico por trás: dois anéis dourados finos com as runas entre eles"""
    r = np.hypot(b.px - MEIO, (b.py - 40.0) * 1.0)
    fora = np.abs(r - 33.0) < 0.6
    dentro = np.abs(r - 29.0) < 0.5
    b.pintar(fora, OURO[3])
    b.pintar(dentro, OURO[2])
    b.peca_de[fora | dentro] = "circulo"
    ang = np.degrees(np.arctan2(b.py - 40.0, np.abs(b.px - MEIO)))   # espelhado em volta do meio
    runa = (r > 29.8) & (r < 32.2) & ((np.floor((ang + 90) / 9.0) % 3) == 0)
    b.pintar(runa, OURO[4])
    b.peca_de[runa] = "circulo"


def chapeu():
    # o cone alto e reto, afinando até a ponta
    t = np.clip((14.0 - b.py) / 26.0, 0, 1)
    cone = np.maximum(np.abs(b.px - MEIO) - (17.0 * (1 - t) + 1.0), np.maximum(-12.0 - b.py, b.py - 14.0))
    m, _ = b.peca("chapeu", cone, NOITE, 3.0, cortes=CORTES, linha=NOITE[0])
    # a faixa de ouro com as runas
    faixa = m & (b.yy >= 6) & (b.yy <= 9)
    for y, c in ((6, 1), (7, 4), (8, 3), (9, 1)):
        b.pintar(faixa & (b.yy == y), OURO[c])
    for x in (20, 25, 29):
        for xx in (x, 63 - x):
            b.ponto(xx, 7, NOITE[1]); b.ponto(xx, 8, NOITE[2])
    # as estrelinhas no cone, espelhadas, e a estrela de ouro na ponta
    for x, y in ((26, 0), (24, 3), (29, -6)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, OURO[4])
    st = estrela(MEIO, -13.0, 3.8, 1.6)
    b.contorno(st, "estrela", OURO[0])
    b.pintar(st, OURO[3])
    b.pintar(st & (b.px < MEIO) & (b.py < -13), OURO[5])
    # a aba larga
    aba = b.bola(MEIO, 14.0, 31.0, 3.6)
    am, _ = b.peca("chapeu", aba, NOITE, 1.8, cortes=CORTES, linha=NOITE[0])
    b.trocar(am & ~np.roll(am, -1, 0), NOITE, [NOITE[0]] * 6)
    for y, passos in ((18, 2), (19, 1), (20, 1)):   # a sombra da aba na testa
        sombra = (b.yy == y) & (b.peca_de == "cabeca")
        b.escurecer(sombra, b.BROWNIE, passos)
        b.escurecer(sombra, b.CALDA, passos)


def monoculo():
    """o monóculo dourado em volta do olho esquerdo dele (à direita na tela): só o aro, o olho fica à mostra; e a
    correntinha descendo até a gola"""
    aro = np.abs(np.hypot((b.px - 41.5) / 5.6, (b.py - 28.5) / 6.4) - 1.0) * 5.6 < 0.55
    b.pintar(aro, OURO[3])
    b.pintar(aro & (b.py < 27) & (b.px < 41.5), OURO[5])
    b.pintar(aro & (b.py > 30) & (b.px > 41.5), OURO[1])
    for k, (x, y) in enumerate(((46, 33), (46, 34), (47, 35), (47, 36), (47, 37), (46, 38), (46, 39), (45, 40))):
        b.ponto(x, y, OURO[4] if k % 2 else OURO[2])

def manto():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, NOITE, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a gola de ouro em V
    for y in range(42, 50):
        meia = 8 - (y - 42)
        b.ponto(31 - meia, y, OURO[4]); b.ponto(32 + meia, y, OURO[2])
    # as constelações bordadas, espelhadas: estrelinhas ligadas por fios
    for (x0, y0), (x1, y1) in (((19, 50), (22, 53)), ((22, 53), (20, 57))):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i // n
            y = y0 + (y1 - y0) * i // n
            for xx in (x, 63 - x):
                b.ponto(xx, y, NOITE[4])
    for x, y in ((19, 50), (22, 53), (20, 57)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, OURO[5])
    # o broche de lua no meio
    lua = (b.bola(MEIO, 53.0, 2.8) <= 0) & (b.bola(MEIO + 1.4, 52.2, 2.3) > 0)
    b.contorno(lua, "broche", OURO[0])
    b.pintar(lua, OURO[3])
    b.pintar(lua & (b.px < MEIO - 1), OURO[5])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), NOITE, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, OURO)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, OURO, None, livre)


def esferas():
    """as duas esferas de magia orbitando no círculo, espelhadas"""
    for cx, cy in ((3.5, 30.0), (60.5, 30.0)):
        b.peca("esfera", b.bola(cx, cy, 2.6), MAGIA + MAGIA[-2:], 1.4, cortes=(0.3, 0.5, 0.7, 0.9, 1.0), linha=MAGIA[0])
        b.ponto(int(cx) - 1, int(cy) - 1, MAGIA[3])
    for x, y in ((6, 26), (1, 35), (7, 34)):   # o rastro de brilho
        for xx in (x, 63 - x):
            b.ponto(xx, y, MAGIA[2])


if __name__ == "__main__":
    b.desenhar(atras=circulo)
    manto()
    chapeu()
    b.img[b.peca_de == "orelha", 3] = 0   # o chapéu cobre as orelhas
    monoculo()
    esferas()
    b.conferencia("browarquimago")
