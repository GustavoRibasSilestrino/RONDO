"""Browpolicial (comum, linha 0, coluna 1): quepe de polícia azul-marinho com a copa larga, a pala preta envernizada, o
cordão dourado e a estrela no meio; no peito, o distintivo de ouro em forma de escudo.  python browpolicial.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

AZUL = [(10, 14, 40), (18, 28, 74), (28, 44, 112), (40, 64, 152), (66, 96, 192), (120, 150, 230)]
PRETO = [(6, 6, 10), (16, 16, 24), (30, 30, 42), (52, 52, 68), (96, 96, 116), (190, 190, 210)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
VERMELHO = [(66, 10, 14), (150, 24, 30), (206, 46, 44)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
BRANCO = (255, 255, 244)


def estrela(cx, cy, r_fora, r_dentro):
    """máscara de uma estrela de 5 pontas"""
    ang = np.arctan2(b.py - cy, b.px - cx) + np.pi / 2
    k = (ang % (2 * np.pi / 5)) / (2 * np.pi / 5)          # 0 a 1 entre duas pontas
    raio = r_dentro + (r_fora - r_dentro) * np.abs(1 - 2 * k)
    return np.hypot(b.px - cx, b.py - cy) <= raio


def quepe():
    # a copa: um disco largo e achatado, inclinado um pouco para a frente, entre as orelhas
    copa = b.bola(31.5, -1.5, 15.0, 6.0)
    b.peca("quepe", copa, AZUL, 3.0, cortes=CORTES, linha=AZUL[1])
    # costura da copa e o vinco do topo
    for x in range(20, 44):
        b.ponto(x, 2, AZUL[1])
    for x in range(22, 30):
        b.ponto(x, -5, AZUL[5])
    # a faixa: o aro do quepe, mais escuro, com o cordão dourado
    faixa = b.caixa(19, 2, 44, 10, 2)
    b.peca("quepe", faixa, [AZUL[0], AZUL[1], AZUL[1], AZUL[2], AZUL[3], AZUL[4]], 2.0, cortes=CORTES, linha=AZUL[0])
    for x in range(20, 44):
        b.ponto(x, 8, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 9, OURO[1])
    for x in (20, 43):   # os botõezinhos que prendem o cordão
        b.ponto(x, 8, OURO[5]); b.ponto(x, 9, OURO[2])
    # a pala: meia-lua preta envernizada que sai para a frente, com reflexo
    pala = np.maximum(b.bola(31.5, 10.5, 13.5, 3.6), 10.5 - b.py)
    b.peca("quepe", pala, PRETO, 1.6, cortes=CORTES, linha=PRETO[0])
    for x in range(22, 30):
        b.ponto(x, 11, PRETO[5] if 24 <= x <= 26 else PRETO[4])
    # sombra da pala na testa
    sombra = (b.yy >= 14) & (b.yy <= 15) & (b.xx >= 19) & (b.xx <= 44) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)
    # a estrela de ouro na frente da copa
    m = estrela(31.5, 2.5, 4.4, 1.9)
    b.contorno(m, "estrela", OURO[0])
    b.pintar(m, OURO[3])
    b.pintar(m & (b.px < 31.5) & (b.py < 3), OURO[5])
    b.pintar(m & (b.px >= 31.5) & (b.py >= 3), OURO[2])
    b.ponto(31, 1, BRANCO)


def medalha():
    """a medalha de honra no peito: uma fita listrada (azul, branco e vermelho) presa por uma barrinha de ouro, uma argola
    e o disco de ouro com aro, a estrela em relevo no meio e um brilho"""
    cx = 24.5
    # a fita: 6 colunas listradas, com luz à esquerda e uma dobra
    fita = (b.yy >= 43) & (b.yy <= 48) & (b.xx >= 22) & (b.xx <= 27)
    b.contorno(fita, "medalha", b.BROWNIE[0])
    listras = {22: AZUL[3], 23: BRANCO, 24: VERMELHO[2], 25: VERMELHO[2], 26: (214, 214, 226), 27: AZUL[2]}
    for x, cor in listras.items():
        for y in range(43, 49):
            b.ponto(x, y, cor)
    for x in (24, 25):   # a dobra da fita, um pouco mais escura embaixo
        b.ponto(x, 47, VERMELHO[1])
    b.ponto(22, 47, AZUL[2]); b.ponto(27, 47, AZUL[1]); b.ponto(23, 47, (214, 214, 226))
    # a barrinha de ouro que prende a fita no peito
    for x in range(21, 29):
        b.ponto(x, 42, OURO[4] if x < 25 else OURO[3])
    b.ponto(21, 42, OURO[1]); b.ponto(28, 42, OURO[1])
    # o disco: ouro com aro, estrela em relevo e brilho
    disco = b.bola(cx, 52.5, 4.2)
    m, _ = b.peca("medalha", disco, OURO, 2.0, cortes=CORTES, linha=OURO[0])
    r = np.hypot(b.px - cx, b.py - 52.5)
    b.escurecer(m & (r >= 2.6) & (r < 3.3), OURO)
    st = estrela(cx, 52.6, 2.4, 1.0)
    b.pintar(st & (b.px < cx + 0.5), OURO[4])
    b.pintar(st & (b.px >= cx + 0.5), OURO[3])
    b.ponto(22, 50, OURO[5]); b.ponto(23, 50, OURO[5]); b.ponto(22, 51, BRANCO)
    # a argola entre a fita e o disco
    b.ponto(24, 49, OURO[4]); b.ponto(25, 49, OURO[2])


if __name__ == "__main__":
    b.desenhar()
    medalha()
    with b.deslocado(b.CABECA_DESCE):
        quepe()
    b.conferencia("browpolicial")
