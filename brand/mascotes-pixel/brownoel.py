"""Brownoel (comum, linha 0, coluna 7): o Papai Noel. Gorro vermelho de pelúcia que tomba para o lado, com a barra de pelo
branco felpudo e o pompom na ponta; casaco vermelho com gola, faixa da frente e punhos de pelo branco e o cinto preto
com fivela de ouro.  python brownoel.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

VERMELHO = [(64, 8, 12), (120, 16, 22), (170, 28, 32), (208, 46, 44), (232, 82, 70), (248, 126, 108)]
PELO = [(120, 112, 136), (176, 170, 192), (218, 214, 230), (240, 238, 248), (251, 250, 255), (255, 255, 255)]
PRETO = [(6, 6, 10), (16, 16, 24), (30, 30, 42), (52, 52, 68), (96, 96, 116), (190, 190, 210)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def tubo(pontos):
    """um tubo que afina: bolas ao longo de um caminho (x, y, raio), unidas"""
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 8):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def gorro():
    # o corpo do gorro: uma cúpula em cima da cabeça que sobe e tomba para a esquerda, afinando até a ponta
    cupula = np.maximum(b.bola(31.5, 15, 21.5, 11.0), b.py - 16)
    caido = tubo([(30, 8, 9.0), (22, 2, 6.5), (13, 1, 4.2), (6, 7, 2.6), (4, 14, 1.8)])
    # as duas partes se fundem numa curva só e contínua (união suave, sem degrau nem dobra onde se encontram)
    k = 9.0
    h = np.maximum(k - np.abs(cupula - caido), 0) / k
    gorro_d = np.minimum(cupula, caido) - h * h * k / 4
    b.peca("gorro", np.maximum(gorro_d, b.py - 16), VERMELHO, 3.0, cortes=CORTES, linha=VERMELHO[0])
    # a barra de pelo branco, felpuda, dando a volta na testa (um pixel para fora da cabeça dos lados)
    barra = b.felpudo(b.caixa(9, 13, 54, 19, 3))
    bm, _ = b.peca("gorro", barra, PELO, 2.0, cortes=CORTES, linha=PELO[0])
    b.tufos(bm, PELO, 7)
    b.escurecer(bm & ((b.xx <= 10) | (b.xx >= 53)), PELO)
    # sombra da barra na testa
    sombra = (b.yy == 21) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # o pompom na ponta, caído do lado esquerdo
    pm, _ = b.peca("gorro", b.felpudo(b.bola(3.5, 19.0, 3.8), 0.5), PELO, 2.2, cortes=CORTES, linha=PELO[0])
    b.tufos(pm, PELO, 3)


def casaco():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, VERMELHO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.escurecer(corpo & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), VERMELHO)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), VERMELHO, 3.0, onde=b.yy <= 52)
        # o punho de pelo
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, PELO)
    # a faixa de pelo descendo pela frente do casaco
    frente = b.felpudo(b.caixa(29, 42, 34, 63, 1), 0.4)
    fm, _ = b.peca("casaco", np.maximum(frente, -(-b.caixa(16, 40, 47, 62, 5))), PELO, 1.4, cortes=CORTES, linha=PELO[1])
    b.tufos(fm, PELO, 11)
    # o cinto preto que dá a volta no corpo, por trás dos braços, com a fivela de ouro
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 54, PRETO, None, livre)
    fivela = [(x, y) for x in range(28, 36) for y in range(53, 59)]
    for x, y in fivela:
        borda = x in (28, 35) or y in (53, 58)
        dentro = x in (29, 34) or y in (54, 57)
        if borda:
            b.ponto(x, y, OURO[0])
        elif dentro:
            b.ponto(x, y, OURO[4] if (x < 32 and y < 56) else OURO[2])
        else:
            b.ponto(x, y, PRETO[2])
    b.ponto(29, 54, OURO[5])
    # a gola de pelo em volta do pescoço, por cima de tudo
    gola = b.caixa(15, 40, 48, 43, 2)
    for x in [31.5 + k * 3.6 for k in range(-4, 5)]:
        t = (x - 31.5) / 16.5
        gola = np.minimum(gola, b.bola(x, 43.2 + 1.2 * (1 - t * t), 2.3, 2.1))
    gm, _ = b.peca("casaco", b.felpudo(gola, 0.3), PELO, 1.4, cortes=CORTES, linha=PELO[0])
    b.tufos(gm, PELO, 5)
    b.escurecer(gm & (np.abs(b.px - 31.5) > 13), PELO)


if __name__ == "__main__":
    b.desenhar()
    casaco()
    gorro()
    # o gorro esconde as orelhas
    b.img[b.peca_de == "orelha", 3] = 0
    b.conferencia("brownoel")
