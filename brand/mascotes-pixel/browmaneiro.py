"""Browmaneiro (comum, linha 0, coluna 3): o descolado. Bandana vermelha com bolinhas amarrada na testa, com o nó e as
pontas soltas do lado, e óculos escuros de armação preta com lentes esfumaçadas, que deixam ver o olho e o brilho por
trás, e reflexos azuis.  python browmaneiro.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

VERMELHO = [(60, 8, 12), (112, 16, 22), (160, 28, 32), (200, 46, 44), (228, 80, 68), (246, 124, 104)]
PRETO = [(6, 6, 10), (16, 16, 24), (30, 30, 42), (52, 52, 68), (96, 96, 116), (190, 190, 210)]
LENTE = [(10, 12, 22), (22, 28, 46), (36, 46, 72), (60, 82, 120)]
REFLEXO = [(110, 170, 230), (190, 226, 255)]
BRANCO = (255, 250, 244)
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def bandana():
    # a faixa dá a volta na testa, passando um pixel para fora da cabeça dos dois lados (está envolvendo)
    d = b.caixa(10, 15, 53, 19, 1)
    m, _ = b.peca("bandana", d, VERMELHO, 1.6, cortes=CORTES, linha=VERMELHO[0])
    # as pontas da faixa viram para trás: um tom mais escuro nas bordas
    b.escurecer(m & ((b.xx <= 11) | (b.xx >= 52)), VERMELHO)
    # vincos do pano e as bolinhas brancas da estampa
    for x in range(13, 52, 5):
        b.ponto(x, 18, VERMELHO[1])
        b.ponto(x + 1, 17, VERMELHO[1])
    for x, y in ((15, 16), (21, 18), (26, 16), (33, 18), (38, 16), (44, 18), (49, 16)):
        b.ponto(x, y, BRANCO)
    # sombra da bandana na testa
    sombra = (b.yy == 20) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # o nó do lado direito e as duas pontas soltas caindo
    for d, cor in ((b.bola(55.5, 18.5, 2.6, 2.2), None),):
        b.peca("bandana", d, VERMELHO, 1.2, cortes=CORTES, linha=VERMELHO[0])
    ponta1 = np.maximum(np.abs(b.px - (56 + (b.py - 19) * 0.5)) - 1.6 + (b.py - 19) * 0.08, np.maximum(19 - b.py, b.py - 27))
    ponta2 = np.maximum(np.abs(b.px - (58 + (b.py - 18) * 0.9)) - 1.4 + (b.py - 18) * 0.08, np.maximum(18 - b.py, b.py - 24))
    for d in (ponta2, ponta1):
        b.peca("bandana", d, VERMELHO, 1.0, cortes=CORTES, linha=VERMELHO[0])
    b.peca("bandana", b.bola(55.5, 18.5, 2.4, 2.0), VERMELHO, 1.2, cortes=CORTES, linha=VERMELHO[0])
    b.ponto(54, 17, VERMELHO[5])
    b.ponto(57, 24, BRANCO)


def oculos():
    """óculos escuros: armação preta grossa em cima, lentes esfumaçadas (o olho e o brilho aparecem por trás),
    ponte no meio, hastes até os lados da cabeça e reflexos em diagonal"""
    lentes = [b.caixa(17, 23, 28, 32, 2), b.caixa(35, 23, 46, 32, 2)]
    # guarda onde estavam o olho e o brilho, para aparecerem por trás da lente
    olho = np.zeros(b.img.shape[:2], bool)
    for c in b.OLHO:
        olho |= np.all(b.img[..., :3] == c, axis=2)
    brilho = np.all(b.img[..., :3] == b.BRANCO, axis=2) & (b.peca_de == "cabeca")
    # hastes (atrás) e ponte
    for x in list(range(11, 17)) + list(range(47, 53)):
        b.ponto(x, 24, PRETO[1]); b.ponto(x, 25, PRETO[0])
    for x in range(29, 35):
        b.ponto(x, 24, PRETO[2]); b.ponto(x, 25, PRETO[1])
    for d in lentes:
        m = d <= 0
        b.contorno(m, "oculos", PRETO[0])
        b.pintar(m, LENTE[2])
        b.pintar(m & (b.py > 29), LENTE[1])        # a lente escurece para baixo
        b.pintar(m & olho, LENTE[0])               # o olho por trás
        b.pintar(m & brilho, LENTE[3])             # o brilho do olho, apagado pela lente
        # a armação grossa em cima
        topo = m & ~np.roll(m, 1, 0)
        b.pintar(topo, PRETO[3])
        b.pintar(np.roll(topo, 1, 0) & m, PRETO[1])
    # reflexos: dois riscos em diagonal no canto de cima de cada lente
    for x0 in (19, 37):
        for i in range(4):
            b.ponto(x0 + 3 - i, 26 + i, REFLEXO[1] if i < 2 else REFLEXO[0])
        for i in range(2):
            b.ponto(x0 + 6 - i, 26 + i, REFLEXO[0])
    # brilho da armação
    b.ponto(18, 23, PRETO[5]); b.ponto(36, 23, PRETO[5])


if __name__ == "__main__":
    b.desenhar()
    bandana()
    oculos()
    b.conferencia("browmaneiro")
