"""Browgato (incomum, linha 1, coluna 7): fantasia de gato. Capuz azul-anil com orelhas pontudas de dentro rosa, bigodes
saindo dos lados e o rosto à mostra numa abertura de cantos arredondados; macacão anil com a barriga branca, patinhas
brancas, pintinhas, coleira vermelha com sininho e o rabo de ponta branca curvado por trás.  python browgato.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ANIL = [(16, 14, 48), (30, 28, 90), (48, 46, 136), (70, 70, 180), (106, 108, 214), (160, 166, 240)]
BRANCO = [(110, 112, 150), (168, 170, 204), (214, 216, 238), (238, 240, 250), (250, 251, 255), (255, 255, 255)]
ROSA = [(150, 50, 100), (210, 100, 150), (244, 160, 196)]
VERMELHO = [(70, 10, 14), (150, 24, 30), (206, 46, 44), (236, 92, 80), (248, 132, 112), (255, 180, 160)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0   # o meio do boneco nas coordenadas contínuas (entre os pixels 31 e 32)


def poligono(pontos):
    """distância com sinal (aproximada) de um polígono convexo, com os pontos em sentido horário na tela"""
    d = np.full(b.img.shape[:2], -99.0)
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]):
        nx, ny = y1 - y0, -(x1 - x0)
        n = np.hypot(nx, ny)
        d = np.maximum(d, ((b.px - x0) * nx + (b.py - y0) * ny) / n)
    return d


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 10):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def rabo():
    """o rabo sai de trás do corpo pela direita, sobe curvando e termina com a ponta branca"""
    caminho = [(44, 59, 2.4), (51, 59, 2.3), (56, 55, 2.2), (58, 49, 2.1), (57, 44, 2.0)]
    b.peca("rabo", tubo(caminho), ANIL, 1.6, cortes=CORTES, linha=ANIL[0])
    b.peca("rabo", tubo([(57.4, 45.5, 2.05), (56.5, 41.5, 1.9)]), BRANCO, 1.4, cortes=CORTES, linha=BRANCO[0])


def orelhas():
    for lado in (1, -1):
        pts = [(10.0, 13.0), (12.5, -6.0), (25.0, 7.0)]
        if lado < 0:
            pts = [(2 * MEIO - x, y) for x, y in pts][::-1]
        b.peca("capuz", poligono(pts), ANIL, 2.2, cortes=CORTES, linha=ANIL[0])
        cx, cy = sum(x for x, _ in pts) / 3, sum(y for _, y in pts) / 3
        dentro = poligono([(cx + (x - cx) * 0.55, cy + (y - cy) * 0.55 + 0.8) for x, y in pts]) <= 0
        b.pintar(dentro, ROSA[1])
        b.pintar(dentro & (b.py > cy + 1.5), ROSA[0])


def capuz():
    abertura = b.caixa(16, 19, 47, 39, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, ANIL, 4.0, cortes=CORTES, linha=ANIL[0])
    for x, y in ((13, 9), (14, 8), (15, 8), (16, 8)):   # brilho do tecido
        b.ponto(x, y, ANIL[5])
    for x, y in ((24, 10), (38, 10), (31, 13), (11, 26), (11, 36)):   # pintinhas claras, espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, y, ANIL[4])
    b.clarear(m & (abertura <= 1.6), ANIL)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # os bigodes: três de cada lado, saindo do capuz para fora, espelhados
    for y0, incl in ((29, -0.35), (31, 0.0), (33, 0.35)):
        for x in range(1, 9):   # um risco contínuo, abrindo para fora
            y = int(round(y0 + incl * (8 - x)))
            b.ponto(x, y, BRANCO[4]); b.ponto(63 - x, y, BRANCO[4])


def macacao():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ANIL, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a barriga branca
    b.vestir("corpo", b.bola(MEIO, 55.0, 6.5, 5.5), BRANCO, 3.0, onde=corpo)
    for x, y in ((19, 50), (20, 57), (43, 52)):   # pintinhas
        b.ponto(x, y, ANIL[4])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), ANIL, 3.0, onde=b.yy <= 51)
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), BRANCO, 3.0, onde=b.yy >= 52)   # a patinha branca
        for dx in (-1, 1):
            b.ponto(int(cx) + dx, 54, ROSA[2])   # as almofadinhas
    for x0 in (21, 35):
        m = b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ANIL, 2.5)
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), BRANCO, 2.5, onde=b.yy >= 64)



def coleira():
    """a coleira vermelha dando a volta no pescoço, logo abaixo do capuz, com o sininho de ouro"""
    b.faixa_envolvente(b.caixa(16, 40, 47, 62, 5) <= 0, 46, VERMELHO)
    sino = b.bola(MEIO, 50.5, 2.4, 2.2)
    b.peca("sino", sino, OURO, 1.4, cortes=CORTES, linha=OURO[0])
    for x in (30, 31, 32, 33):
        b.ponto(x, 51, OURO[1])
    b.ponto(31, 52, OURO[0]); b.ponto(32, 52, OURO[0])
    b.ponto(30, 49, OURO[5])


if __name__ == "__main__":
    b.desenhar(atras=rabo)
    macacao()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas de bolo ficam dentro do capuz
    orelhas()
    capuz()
    coleira()
    b.conferencia("browgato")
