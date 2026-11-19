"""Browrubi (épico, linha 3, coluna 13): o rubi. Coroa de cinco pontas de rubi lapidado num aro de ouro com as
pedrinhas; manto de veludo roxo com a gola de ouro, a corrente de ouro em V e o grande rubi lapidado no peito; o brilho
magenta em volta de todo o corpo e as faíscas de rubi.  python browrubi.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

RUBI = [(80, 0, 24), (150, 8, 44), (206, 24, 64), (240, 64, 96), (255, 130, 160), (255, 210, 225)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
VELUDO = [(30, 6, 44), (56, 14, 84), (88, 26, 126), (120, 42, 166), (154, 70, 200), (192, 112, 232)]
BRILHO = [(150, 30, 150), (210, 80, 200), (250, 150, 240)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def poligono(pontos):
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]))
    if area < 0:
        pontos = pontos[::-1]
    d = np.full(b.img.shape[:2], -99.0)
    for (x0, y0), (x1, y1) in zip(pontos, pontos[1:] + pontos[:1]):
        nx, ny = y1 - y0, -(x1 - x0)
        n = np.hypot(nx, ny)
        d = np.maximum(d, ((b.px - x0) * nx + (b.py - y0) * ny) / n)
    return d


def coroa():
    """o aro de ouro e as cinco pontas de rubi lapidado (faces clara e escura e o fio de luz)"""
    pontas = [(18.5, -2.13, 3.4), (25.0, -5.13, 3.4), (MEIO, -9.13, 3.8), (39.0, -5.13, 3.4), (45.5, -2.13, 3.4)]
    for cx, topo, larg in pontas:
        m = poligono([(cx - larg, 8.0), (cx - larg, topo + larg * 1.4), (cx, topo), (cx + larg, topo + larg * 1.4),
                      (cx + larg, 8.0)]) <= 0
        b.contorno(m, "coroa", RUBI[0])
        b.pintar(m, RUBI[2])
        b.pintar(m & (b.px < cx - 0.2), RUBI[3])
        b.pintar(m & (b.px < cx - larg + 1.2), RUBI[4])
        b.pintar(m & (b.px > cx + larg - 1.2), RUBI[1])
        b.pintar(m & (np.abs(b.px - cx) < 0.6), RUBI[5])
    aro = b.caixa(15, 6, 48, 12, 1)
    b.peca("coroa", aro, OURO, 1.4, cortes=CORTES, linha=OURO[0])
    for x in range(15, 49):
        b.ponto(x, 7, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 11, OURO[1])
    for x in (19, 25):   # as pedrinhas de rubi no aro, espelhadas
        for xx, claro in ((x, True), (x + 1, False), (63 - x, True), (62 - x, False)):
            b.ponto(xx, 9, RUBI[4] if claro else RUBI[2])
    for xx in (31, 32):
        b.ponto(xx, 8, RUBI[4] if xx == 31 else RUBI[3])
        b.ponto(xx, 9, RUBI[2]); b.ponto(xx, 10, RUBI[1])
    sombra = (b.yy == 13) & (b.xx >= 15) & (b.xx <= 48) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def manto():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    b.vestir("corpo", d_corpo, VELUDO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), VELUDO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, OURO)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 59, OURO, None, livre)
    # a corrente de ouro em V, de elos alternados
    for k in range(6):
        y = 45 + k
        for x, c in ((25 + k, OURO[4] if k % 2 else OURO[2]), (38 - k, OURO[3] if k % 2 else OURO[1])):
            b.ponto(x, y, c)
    # o grande rubi lapidado no peito: o octógono com a mesa clara e as facetas
    pedra = poligono([(MEIO - 2.0, 50.0), (MEIO + 2.0, 50.0), (MEIO + 4.0, 52.5), (MEIO + 4.0, 54.5),
                      (MEIO + 2.0, 57.0), (MEIO - 2.0, 57.0), (MEIO - 4.0, 54.5), (MEIO - 4.0, 52.5)])
    m = pedra <= 0
    b.contorno(m, "pingente", OURO[0])
    b.pintar(m, RUBI[2])
    b.pintar(m & (pedra > -1.0) & (b.py < 53.5), RUBI[4])
    b.pintar(m & (pedra > -1.0) & (b.py >= 53.5), RUBI[1])
    mesa = (np.abs(b.px - MEIO) < 2.0) & (np.abs(b.py - 53.5) < 1.5)
    b.pintar(m & mesa, RUBI[3])
    b.ponto(30, 52, RUBI[5]); b.ponto(31, 52, RUBI[5])


def brilho():
    """o brilho magenta em volta de todo o corpo: duas camadas de luz por fora do contorno, e as faíscas de rubi"""
    def crescer(m):
        """aumenta a máscara um pixel para cada lado, sem dar a volta na borda da imagem"""
        n = m.copy()
        n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
        return n
    cheio = b.img[..., 3] > 0
    perto = crescer(crescer(cheio))
    longe = crescer(crescer(perto))
    anel_dentro = perto & ~cheio
    anel_fora = longe & ~perto & ((b.yy + np.abs(b.px - MEIO).astype(int)) % 2 == 0)   # pontilhado: a luz se apagando
    b.img[anel_fora] = (*BRILHO[0], 255)
    b.img[anel_dentro] = (*BRILHO[1], 255)    # pontinhos claros espalhados no brilho, espelhados
    ys, xs = np.nonzero(anel_dentro)
    for y, x in zip(ys, xs):
        if (y * 7 + abs(x - 39.5) * 3) % 11 == 0:
            b.img[y, x] = (*BRILHO[2], 255)
    for x, y in ((0, 10), (-4, 30), (2, 50)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, RUBI[5])
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                b.ponto(xx + dx, y + dy, RUBI[3])


if __name__ == "__main__":
    b.desenhar()
    manto()
    with b.deslocado(b.CABECA_DESCE):
        coroa()
    brilho()
    b.conferencia("browrubi")
