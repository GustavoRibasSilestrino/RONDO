"""Browciber (lendário, linha 4, coluna 11): o ciborgue. O browniezinho de metal ciano cromado, com a calda virando uma
placa de metal roxo com as trilhas de circuito acesas; as antenas de raio saindo das orelhas, faiscando; os parafusos
das orelhas; a armadura roxa com as trilhas ciano acesas, o núcleo de energia brilhando no peito e as juntas de metal;
as faíscas elétricas em volta.  python browciber.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

CROMO = [(20, 70, 100), (40, 120, 160), (80, 170, 210), (130, 210, 236), (184, 236, 250), (236, 252, 255)]
PLACA = [(20, 8, 44), (40, 18, 84), (64, 32, 130), (92, 52, 172), (124, 80, 210), (170, 130, 240)]
CIANO = [(10, 120, 160), (40, 200, 240), (150, 245, 255), (240, 255, 255)]
ROXO = [(16, 8, 36), (32, 16, 66), (52, 28, 100), (76, 44, 140), (104, 66, 178), (140, 100, 214)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def trilha(pontos, mascara, cor=None):
    """uma trilha de circuito acesa, em segmentos retos, com a bolinha na ponta; espelhada"""
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i // max(n, 1)
            y = y0 + (y1 - y0) * i // max(n, 1)
            for xx in (x, 63 - x):
                if mascara[y + b.OY, xx + b.OX]:
                    b.ponto(xx, y, cor or CIANO[1])
    xf, yf = pontos[-1]
    for xx in (xf, 63 - xf):
        b.ponto(xx, yf, CIANO[3])


def antenas():
    """as antenas de raio saindo das orelhas: o raio em ziguezague aceso, espelhado"""
    raio = [(15, 6), (14, 5), (13, 4), (12, 3), (13, 2), (14, 1), (15, 0), (14, -1), (13, -2), (12, -3), (11, -4),
            (12, -5), (13, -6), (14, -7), (13, -8), (12, -9), (11, -10)]
    for x, y in raio:
        for xx in (x, 63 - x):
            b.ponto(xx - 1, y, CIANO[0]); b.ponto(xx, y, CIANO[2]); b.ponto(xx + 1, y, CIANO[0])
    for x, y in ((11, -12), (9, -10), (13, -12), (9, -8)):   # as faíscas na ponta
        for xx in (x, 63 - x):
            b.ponto(xx, y, CIANO[3])
    # os parafusos no meio das orelhas
    for cx in (15, 48):
        b.ponto(cx, 10, ROXO[1]); b.ponto(cx, 11, ROXO[1]); b.ponto(cx - 1 if cx < 32 else cx + 1, 10, CIANO[3])


def placa_da_cabeca():
    """as trilhas acesas na placa roxa (a calda) do alto da cabeça"""
    calda = np.zeros(b.img.shape[:2], bool)
    for c in PLACA:
        calda |= np.all(b.img[..., :3] == c, axis=2)
    trilha([(20, 13), (20, 16), (24, 16)], calda)
    trilha([(27, 12), (27, 15)], calda)
    # os rebites da placa, espelhados
    for x in (14, 23):
        for xx in (x, 63 - x):
            if calda[13 + b.OY, xx + b.OX]:
                b.ponto(xx, 13, PLACA[5])


def armadura():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ROXO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    trilha([(19, 44), (19, 50), (23, 50), (23, 54)], corpo)
    trilha([(21, 58), (26, 58), (26, 55)], corpo)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ROXO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 47, CROMO)   # a junta de metal
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ROXO, 2.5)
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), CROMO, 2.5, onde=b.yy >= 64)
    # a gola de metal em V
    for y in range(42, 48):
        meia = 6 - (y - 42)
        b.ponto(31 - meia, y, CROMO[4]); b.ponto(32 + meia, y, CROMO[2])
    # o núcleo de energia no peito: o anel de metal, o miolo ciano brilhando e o clarão
    b.peca("nucleo", b.bola(MEIO, 52.0, 4.0), CROMO, 1.6, cortes=CORTES, linha=ROXO[0])
    miolo = b.bola(MEIO, 52.0, 2.6) <= 0
    b.pintar(miolo, CIANO[1])
    b.pintar(b.bola(MEIO, 52.0, 1.5) <= 0, CIANO[2])
    b.ponto(31, 51, CIANO[3]); b.ponto(32, 51, CIANO[3])


def faiscas():
    """as faíscas elétricas em volta: raiozinhos em ziguezague, espelhados"""
    for x0, y0 in ((2, 24), (-3, 42)):
        for k, (dx, dy) in enumerate(((0, 0), (1, 1), (0, 2), (1, 3))):
            for xx in (x0 + dx, 63 - x0 - dx):
                b.ponto(xx, y0 + dy, CIANO[2] if k % 2 else CIANO[3])
    for x, y in ((6, 10), (-1, 56)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, CIANO[2])


if __name__ == "__main__":
    b.BROWNIE = CROMO
    b.CALDA = PLACA
    b.desenhar()
    armadura()
    placa_da_cabeca()
    with b.deslocado(b.CABECA_DESCE):
        antenas()
    faiscas()
    b.conferencia("browciber")
