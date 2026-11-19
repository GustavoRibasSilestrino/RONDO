"""Browceleste (lendário, linha 4, coluna 5): o celeste. Capuz feito do céu da noite: azul-profundo com a nebulosa
roxa, as estrelinhas espalhadas e a beira ciano acesa em volta do rosto (o rosto à mostra numa abertura de cantos
arredondados); a auréola ciano de luz flutuando em cima; a roupa de galáxia com a gola ciano em V e a estrela-guia no
peito; a lua crescente e as estrelas orbitando em volta.  python browceleste.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

CEU = [(6, 6, 30), (14, 16, 62), (26, 30, 104), (40, 50, 146), (62, 78, 190), (100, 120, 226)]
NEBULOSA = [(70, 30, 120), (110, 50, 170), (150, 90, 210)]
CIANO = [(10, 90, 140), (30, 170, 220), (100, 220, 250), (180, 245, 255), (230, 252, 255), (255, 255, 255)]
LUA = [(150, 130, 70), (220, 200, 120), (250, 238, 180), (255, 252, 230)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def ceu_estrelado(mascara, semente, densidade=0.06):
    """a nebulosa roxa em manchas suaves e as estrelinhas espalhadas, espelhadas em volta do meio"""
    ax = np.abs(b.px - MEIO)
    neb = np.sin(ax * 0.22 + b.py * 0.45) * 0.9 + np.sin(b.py * 0.13 - ax * 0.4)   # faixas tortas, como um rio de estrelas
    b.pintar(mascara & (neb > 1.25), NEBULOSA[0])
    b.pintar(mascara & (neb > 1.6), NEBULOSA[1])
    rng = np.random.default_rng(semente)
    ys, xs = np.nonzero(mascara)
    for y, x in zip(ys, xs):
        xf = x - b.OX
        if xf > 31:
            continue
        if rng.random() < densidade:
            cor = CIANO[5] if rng.random() < 0.4 else CIANO[3]
            for xx in (xf, 63 - xf):
                b.ponto(xx, y - b.OY, cor)


def aureola():
    """o anel de luz ciano flutuando acima da cabeça, mais grosso na frente, com os reflexos"""
    fora = b.bola(MEIO, -2.0, 13.0, 4.0)
    dentro = b.bola(MEIO, -2.6, 9.6, 2.1)
    b.peca("aureola", np.maximum(fora, -dentro), CIANO, 1.6, cortes=(0.3, 0.45, 0.6, 0.72, 0.93), linha=CIANO[0])
    for x in range(24, 30):
        b.ponto(x, 1, CIANO[5] if 25 <= x <= 27 else CIANO[4])
    b.ponto(39, -5, CIANO[5]); b.ponto(40, -5, CIANO[4])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, CEU, 4.0, cortes=CORTES, linha=CEU[0])
    ceu_estrelado(m & (abertura > 2.0), 7)
    # a beira ciano acesa em volta do rosto
    beira = m & (abertura <= 2.0)
    b.pintar(beira, CIANO[2])
    b.pintar(beira & (abertura <= 1.0), CIANO[1])
    b.pintar(beira & (abertura > 1.4) & (b.py < 30) & (b.px < MEIO), CIANO[4])
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)


def roupa():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, CEU, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), CEU, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, CIANO)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), CEU, 2.5)
    galaxia = (np.isin(b.peca_de, ("corpo", "braco", "perna"))) & (b.img[..., 3] > 0)
    roupa_toda = galaxia.copy()
    ceu_estrelado(roupa_toda & (b.py > 44), 11, 0.05)
    # a gola ciano em V acesa
    for y in range(44, 51):
        meia = 7 - (y - 44)
        b.ponto(31 - meia, y, CIANO[3]); b.ponto(32 + meia, y, CIANO[2])
    # a estrela-guia no peito: quatro pontas compridas, centralizada
    for k, cor in ((0, CIANO[5]), (1, CIANO[4]), (2, CIANO[3]), (3, CIANO[2])):
        for xx in (31, 32):
            b.ponto(xx, 54 - k, cor); b.ponto(xx, 55 + k, cor)
        b.ponto(30 - k, 54, cor); b.ponto(30 - k, 55, cor); b.ponto(33 + k, 54, cor); b.ponto(33 + k, 55, cor)


def ceu_em_volta():
    """a lua crescente de um lado e a estrela grande do outro, e estrelinhas, nas mesmas alturas"""
    lua = (b.bola(2.0, 24.0, 4.0) <= 0) & (b.bola(3.6, 22.8, 3.4) > 0)
    b.contorno(lua, "lua", LUA[0])
    b.pintar(lua, LUA[2])
    b.pintar(lua & (b.px < 1.0), LUA[3])
    for k, cor in ((0, CIANO[5]), (1, CIANO[4]), (2, CIANO[3]), (3, CIANO[2])):
        b.ponto(61, 24 - k, cor); b.ponto(61, 24 + k, cor); b.ponto(61 - k, 24, cor); b.ponto(61 + k, 24, cor)
    for x, y in ((4, 6), (-3, 40), (7, 46), (1, 12)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, CIANO[4])


if __name__ == "__main__":
    b.desenhar()
    roupa()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    capuz()
    aureola()
    ceu_em_volta()
    b.conferencia("browceleste")
