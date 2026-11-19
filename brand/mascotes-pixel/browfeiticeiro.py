"""Browfeiticeiro (raro, linha 2, coluna 7): o feiticeiro. Chapéu violeta torto, de aba inclinada e a ponta tombando para a
esquerda, com a fita laranja, a fivela de ouro e a lua crescente; manto violeta com a gola alta, o amuleto de rubi na
corrente de ouro e as runas bordadas; o cajado com a esfera mágica brilhando na mão e o livro de feitiços flutuando
aberto do outro lado.  python browfeiticeiro.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

VIOLETA = [(24, 12, 60), (46, 24, 108), (74, 40, 160), (104, 62, 204), (140, 98, 232), (186, 150, 250)]
LARANJA = [(110, 34, 6), (180, 64, 12), (230, 104, 24), (250, 148, 46), (255, 190, 90), (255, 226, 150)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
MADEIRA = [(40, 20, 10), (78, 42, 20), (118, 70, 36), (156, 100, 56)]
MAGIA = [(20, 90, 80), (30, 170, 140), (80, 230, 190), (170, 255, 230), (240, 255, 250)]
RUBI = [(110, 0, 30), (200, 20, 60), (250, 90, 120), (255, 200, 210)]
PAPEL = [(150, 120, 80), (210, 186, 140), (240, 226, 190), (252, 246, 224)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 10):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def elipse_girada(cx, cy, rx, ry, graus):
    a = np.radians(graus)
    u = (b.px - cx) * np.cos(a) + (b.py - cy) * np.sin(a)
    v = -(b.px - cx) * np.sin(a) + (b.py - cy) * np.cos(a)
    return (np.hypot(u / rx, v / ry) - 1) * min(rx, ry)


def chapeu():
    # o cone, torto: largo embaixo, subindo um pouco para a direita e tombando a ponta para a esquerda
    cone = tubo([(32.5, 10, 18.0), (33.5, 3, 12.5), (33, -4, 8.0), (29, -10, 5.0), (23, -13, 3.0), (17, -12, 1.8),
                 (14, -9, 1.2)])
    cone = np.maximum(cone, b.py - 14)
    m, _ = b.peca("chapeu", cone, VIOLETA, 3.5, cortes=CORTES, linha=VIOLETA[0])
    # a fita laranja na base do cone, com a fivela de ouro
    fita = m & (b.yy >= 5) & (b.yy <= 9)
    for y, c in ((5, 1), (6, 4), (7, 3), (8, 2), (9, 1)):
        b.pintar(fita & (b.yy == y), LARANJA[c])
    for x in range(37, 43):
        for y in range(5, 10):
            borda = x in (37, 42) or y in (5, 9)
            b.ponto(x, y, (OURO[4] if x < 40 else OURO[2]) if borda else LARANJA[1])
    # a lua crescente de ouro no cone
    lua = (b.bola(29.5, -2.5, 3.6) <= 0) & (b.bola(31.2, -3.4, 3.0) > 0)
    b.contorno(lua, "lua", OURO[0])
    b.pintar(lua, OURO[3])
    b.pintar(lua & (b.px < 28.5), OURO[5])
    for x, y in ((36, -2), (26, 2), (33, -8)):   # estrelinhas
        b.ponto(x, y, OURO[4])
    # a aba larga e inclinada (mais alta à direita)
    aba = elipse_girada(32.0, 14.0, 31.0, 3.6, -7)
    am, _ = b.peca("chapeu", aba, VIOLETA, 1.8, cortes=CORTES, linha=VIOLETA[0])
    b.trocar(am & ~np.roll(am, -1, 0), VIOLETA, [VIOLETA[0]] * 6)
    b.escurecer(am & (np.abs(b.px - MEIO) > 26), VIOLETA)
    for y, passos in ((19, 2), (20, 1), (21, 1)):   # a sombra da aba na testa
        sombra = (b.yy == y) & (b.peca_de == "cabeca")
        b.escurecer(sombra, b.BROWNIE, passos)
        b.escurecer(sombra, b.CALDA, passos)


def manto():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, VIOLETA, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # a gola alta, aberta em V, com a beira laranja
    for y in range(41, 47):
        abre = 7 - (y - 41)
        for x in (31 - abre, 32 + abre):
            b.ponto(x, y, LARANJA[3] if x < 32 else LARANJA[2])
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), VIOLETA, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, LARANJA)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 58, LARANJA, (OURO[4], OURO[2]), livre)
    # as runas bordadas, espelhadas
    runas = (((20, 53), (20, 54), (20, 55), (21, 54)), ((25, 55), (26, 54), (26, 56), (27, 55)))
    for runa in runas:
        for x, y in runa:
            for xx in (x, 63 - x):
                b.ponto(xx, y, VIOLETA[5])
    # o amuleto: a corrente de ouro em V e o rubi no engaste
    for k in range(4):
        b.ponto(28 + k, 45 + k, OURO[3]); b.ponto(35 - k, 45 + k, OURO[3])
    b.peca("amuleto", b.bola(MEIO, 51.0, 2.8), OURO, 1.4, cortes=CORTES, linha=OURO[0])
    b.peca("amuleto", b.bola(MEIO, 51.0, 1.5), RUBI, 1.0, cortes=(0.3, 0.55, 0.8, 0.95, 1.0), linha=RUBI[0])
    b.ponto(31, 50, RUBI[3])


def cajado():
    """o cajado de madeira na mão direita, com a esfera mágica brilhando e os redemoinhos de magia"""
    for y in range(39, 62):
        x = 55
        b.ponto(x - 1, y, MADEIRA[0]); b.ponto(x + 2, y, MADEIRA[0])
        b.ponto(x, y, MADEIRA[3] if y % 4 == 0 else MADEIRA[2]); b.ponto(x + 1, y, MADEIRA[1])
    for x in (53, 58):   # as garras de madeira segurando a esfera
        for y in (35, 36, 37, 38):
            b.ponto(x, y, MADEIRA[2] if x < 56 else MADEIRA[1])
    b.peca("esfera", b.bola(55.5, 33.5, 3.4), MAGIA + [MAGIA[-1]], 1.8, cortes=(0.3, 0.5, 0.7, 0.88, 0.97),
           linha=MAGIA[0])
    b.ponto(54, 32, MAGIA[4]); b.ponto(54, 31, MAGIA[4])
    for x, y in ((50, 30), (60, 28), (61, 36), (49, 36), (56, 27)):   # as faíscas de magia
        b.ponto(x, y, MAGIA[3])


def livro():
    """o livro de feitiços flutuando aberto do lado esquerdo, com as linhas escritas e o brilho embaixo"""
    for x in range(1, 13):
        for y in range(38, 45):
            meio = x in (6, 7)
            b.ponto(x, y, PAPEL[1] if meio else (PAPEL[3] if x < 6 else PAPEL[2]))
    for x in range(0, 14):
        b.ponto(x, 45, VIOLETA[1]); b.ponto(x, 46, VIOLETA[0])   # a capa
    for x in (0, 13):
        for y in range(38, 46):
            b.ponto(x, y, VIOLETA[1])
    for y in (39, 41, 43):   # as linhas do feitiço
        for x in (2, 3, 4, 9, 10, 11):
            if (x + y) % 3:
                b.ponto(x, y, VIOLETA[2])
    for x, y in ((3, 49), (7, 50), (10, 48), (6, 35)):   # o brilho mágico
        b.ponto(x, y, MAGIA[3])


if __name__ == "__main__":
    b.desenhar()
    manto()
    cajado()
    livro()
    chapeu()
    b.img[b.peca_de == "orelha", 3] = 0   # o chapéu cobre as orelhas
    b.conferencia("browfeiticeiro")
