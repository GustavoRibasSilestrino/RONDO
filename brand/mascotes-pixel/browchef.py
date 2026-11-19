"""Browchef (mascote nº 3: linha 0, coluna 2): a base com o chapéu de chef fofo entre as orelhas e o lenço vermelho de
cozinheiro com borda de ouro e uma medalha na ponta.  python browchef.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

BRANCO = [(112, 108, 146), (156, 152, 188), (194, 192, 218), (224, 222, 238), (244, 242, 250), (255, 255, 255)]
LINHA_BRANCO = (150, 146, 180)
VERMELHO = [(66, 10, 14), (116, 18, 24), (164, 30, 34), (202, 50, 46), (230, 84, 70), (248, 128, 108)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]


def chapeu():
    # a faixa: um tubo de pano em cima da cabeça, entre as orelhas, com pregas verticais
    d_faixa = b.caixa(22, -2, 41, 10, 2)
    faixa, _ = b.peca("chapeu", d_faixa, BRANCO, 3.0, cortes=(0.3, 0.45, 0.58, 0.68, 0.93), linha=LINHA_BRANCO)
    for x in (26, 30, 34, 38):   # pregas: um vinco escuro com a luz do lado esquerdo
        for y in range(0, 9):
            b.ponto(x, y, BRANCO[2])
            b.ponto(x - 1, y, BRANCO[5] if y < 5 else BRANCO[4])
    # costura de baixo, um pouco mais escura, e a sombra que a faixa joga na calda
    for x in range(23, 41):
        b.ponto(x, 9, BRANCO[2])
    sombra = (b.yy >= 11) & (b.yy <= 11) & (b.xx >= 22) & (b.xx <= 41) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)
    # o topo fofo: gomos de pano estufado, os de trás primeiro, cada um com o seu contorno suave
    gomos = [(26.5, -10, 6.5, 6.0), (37.5, -10, 6.5, 6.0), (23.5, -4, 6.0, 5.5), (40.5, -4, 6.0, 5.5), (32, -5, 7.5, 6.5)]
    for cx, cy, rx, ry in gomos:
        b.peca("chapeu", b.bola(cx, cy, rx, ry), BRANCO, 4.0, cortes=(0.3, 0.45, 0.58, 0.68, 0.93), linha=LINHA_BRANCO)
    # brilho no alto à esquerda de cada gomo
    for cx, cy, rx, ry in gomos:
        x0, y0 = int(cx - rx * 0.45), int(cy - ry * 0.55)
        b.ponto(x0, y0, BRANCO[5]); b.ponto(x0 + 1, y0, BRANCO[5]); b.ponto(x0, y0 + 1, BRANCO[5])


def lenco():
    # um triângulo de pano vermelho preso no pescoço (logo abaixo da cabeça), com a ponta caindo no peito
    topo, ponta, meia = 42, 55, 13.5
    inclinado = ((b.py - topo) - (ponta - topo) * (1 - np.abs(b.px - 32) / meia)) / np.hypot(1, (ponta - topo) / meia)
    d = np.maximum(topo - b.py, inclinado)
    m, _ = b.peca("lenco", d, VERMELHO, 2.5, linha=VERMELHO[0])
    # dobras do pano: dois vincos que descem em diagonal até a ponta
    for x0, passo in ((25, 1), (39, -1)):
        for i in range(7):
            x, y = x0 + passo * i, 44 + i
            if m[y + b.OY, x + b.OX]:
                b.ponto(x, y, VERMELHO[1])
                b.ponto(x - passo, y, VERMELHO[4])
    # sombra da cabeça no alto do lenço
    for x in range(20, 44):
        if m[42 + b.OY, x + b.OX]:
            b.ponto(x, 42, VERMELHO[1])
    # borda de ouro nos dois lados que descem
    borda = m & ~(np.roll(m, -1, 1) & np.roll(m, 1, 1) & np.roll(m, -1, 0))
    borda &= b.yy > 42
    b.pintar(borda, OURO[3])
    b.clarear(borda & (b.xx < 32), OURO, 1)
    b.escurecer(borda & (b.xx > 32), OURO, 1)
    # a medalha de ouro na ponta, com uma estrelinha
    b.peca("medalha", b.bola(32, 56.5, 3.6), OURO, 2.5, linha=OURO[0])
    for x, y in ((32, 54), (31, 55), (32, 55), (33, 55), (30, 56), (31, 56), (32, 56), (33, 56), (34, 56), (31, 57), (33, 57)):
        b.ponto(x, y, OURO[5] if y < 56 else OURO[4])
    b.ponto(32, 57, OURO[2])


if __name__ == "__main__":
    b.desenhar()
    lenco()
    with b.deslocado(b.CABECA_DESCE):
        chapeu()
    b.conferencia("browchef")
