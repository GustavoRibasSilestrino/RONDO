"""Browramsés (lendário, linha 4, coluna 1): o browniezinho faraó. Toucado nemes listrado de ouro e lápis-lazúli que cobre
a cabeça e cai dos lados do rosto, faixa de ouro na testa com a cobra real (uraeus) de olho de rubi, colar largo de faraó
em anéis de ouro, lápis e turquesa, pulseiras de ouro e cinto com avental pregueado.  python browramses.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
LAPIS = [(12, 14, 54), (24, 32, 100), (38, 56, 152), (58, 86, 198), (94, 128, 232), (156, 186, 252)]
TURQUESA = [(8, 60, 70), (16, 106, 114), (30, 152, 156), (70, 200, 196), (130, 232, 220), (200, 252, 244)]
RUBI = [(90, 6, 20), (176, 20, 40), (240, 70, 80), (255, 190, 196)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


# a abertura do rosto: um quadrado de cantos pouco arredondados, da testa até embaixo, entre as abas, para o toucado
# emoldurar o rosto sem cobrir os olhos
ROSTO = dict(x0=16, y0=15, x1=47, y1=48, raio=2, cy=27.0)


def abertura():
    """a abertura quadrada do rosto com uma ponta no meio: o pano desce em U entre os olhos (onde fica a cobra)"""
    c = ROSTO
    arco = b.caixa(c["x0"], c["y0"], c["x1"], c["y1"], c["raio"])
    ponta = np.minimum(b.caixa(30, 10, 33, 21, 1), b.bola(31.5, 21.5, 1.9, 2.2))
    return np.maximum(arco, -ponta)


def toucado():
    # o pano do nemes: a touca por cima da cabeça e as duas abas largas que caem do lado do rosto, numa peça só, com o
    # arco do rosto recortado
    touca = b.caixa(10, 0, 53, 30, 10)
    abas = np.minimum(b.caixa(5, 15, 15, 39, 4), b.caixa(48, 15, 58, 39, 4))   # terminam no ombro
    d = np.maximum(np.minimum(touca, abas), -abertura())
    m, _ = b.peca("toucado", d, OURO, 3.5, cortes=CORTES, linha=OURO[1])
    # listras: no alto elas saem em leque do meio da testa; dos lados do rosto e nas abas são horizontais
    ang = np.arctan2(b.py - 24, b.px - 31.5)
    alto = b.py < 19
    listra_touca = (np.floor(ang / (np.pi / 11)) % 2 == 0) & alto
    listra_aba = (np.floor((b.py - 14) / 2.5) % 2 == 0) & ~alto
    b.trocar(m & (listra_touca | listra_aba), OURO, LAPIS)
    # a barra das abas: uma faixa de ouro liso na ponta de baixo
    b.trocar(m & (b.yy >= 37), LAPIS, OURO)
    # a faixa de ouro contornando o arco do rosto, com uma fileira de pontinhos
    c = ROSTO
    # (2,5 pixels de largura em volta da abertura, inclusive na ponta do meio)
    ab = abertura()
    faixa = np.maximum(np.maximum(ab - 2.5, -ab), b.py - 39)   # os lados descem até o fim das abas
    fm, _ = b.peca("faixa", faixa, OURO, 1.2, cortes=CORTES, linha=OURO[0])
    pontinhos = [(x, c["y0"] - 2) for x in range(c["x0"] + 1, c["x1"], 3) if abs(x - 31.5) > 3]
    pontinhos += [(x, y) for x in (c["x0"] - 2, c["x1"] + 1) for y in range(c["y0"] + 2, 38, 3)]
    for x, y in pontinhos:
        if fm[y + b.OY + b._dy, x + b.OX]:
            b.ponto(x, y, OURO[5])
    # o veio da ponta do meio
    for y in range(13, 21):
        b.ponto(31, y, OURO[4])
    # sombra do toucado no rosto: a beira de dentro do arco fica um tom mais escura
    beira = (abertura() <= 0) & (abertura() > -1.2) & (b.peca_de == "cabeca") & (b.py < c["cy"] + 2)
    b.escurecer(beira, b.BROWNIE)
    b.escurecer(beira, b.CALDA)


def uraeus():
    """a cobra real erguida no alto do arco, no meio da testa: corpo de ouro, capelo largo com escamas de lápis e olho
    de rubi"""
    capelo = b.bola(32, 10.5, 3.6, 5.0)
    pescoco = b.caixa(31, 13, 33, 17, 1)
    m, _ = b.peca("uraeus", np.minimum(capelo, pescoco), OURO, 1.6, cortes=CORTES, linha=OURO[0])
    # escamas do capelo
    for x, y in ((31, 8), (33, 8), (32, 10), (30, 11), (34, 11), (32, 12)):
        b.ponto(x, y, LAPIS[3])
    # cabeça da cobra no alto, com o olho de rubi
    b.peca("uraeus", b.bola(32, 5.2, 2.2, 2.0), OURO, 1.2, cortes=CORTES, linha=OURO[0])
    b.ponto(32, 5, RUBI[2])
    b.ponto(31, 5, RUBI[3])
    b.ponto(31, 4, OURO[5])


def colar():
    """o colar largo (usekh): meia-lua no peito, em anéis de ouro, lápis e turquesa, com contas de ouro na beira"""
    d = np.maximum(b.bola(32, 40.5, 16, 10), b.caixa(16, 40, 47, 62, 5))
    m, _ = b.peca("colar", d, OURO, 2.0, cortes=CORTES, linha=OURO[0])
    r = np.hypot((b.px - 32) / 16, (b.py - 40.5) / 10)
    b.trocar(m & (r >= 0.62) & (r < 0.76), OURO, LAPIS)
    b.trocar(m & (r >= 0.76) & (r < 0.9), OURO, TURQUESA)
    # contas de ouro penduradas na beira, uma a cada 3 pixels
    for x in range(18, 47, 3):
        borda = [y for y in range(40, 56) if m[y + b.OY, x + b.OX]]
        if borda:
            y = max(borda) + 1
            b.ponto(x, y, OURO[3]); b.ponto(x, y + 1, OURO[1])
            b.ponto(x, y - 1, OURO[4])
    # um escaravelho de lápis no meio do colar
    for x, y, c in ((31, 48, LAPIS[2]), (32, 48, LAPIS[2]), (30, 49, LAPIS[1]), (31, 49, LAPIS[4]), (32, 49, LAPIS[3]),
                    (33, 49, LAPIS[1]), (31, 50, LAPIS[2]), (32, 50, LAPIS[1]), (29, 48, OURO[4]), (34, 48, OURO[4])):
        b.ponto(x, y, c)


def cinto_e_avental():
    # o cinto de ouro dá a volta no corpo, por trás dos braços, com uma joia de lápis no meio
    corpo = b.caixa(16, 40, 47, 62, 5) <= 0
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(corpo, 54, OURO, (LAPIS[2], LAPIS[1]), livre)
    for x, y, c in ((30, 55, LAPIS[3]), (31, 55, LAPIS[5]), (32, 55, LAPIS[3]), (33, 55, LAPIS[2]),
                    (30, 56, LAPIS[2]), (31, 56, LAPIS[2]), (32, 56, LAPIS[1]), (33, 56, LAPIS[1]),
                    (29, 55, OURO[0]), (29, 56, OURO[0]), (34, 55, OURO[0]), (34, 56, OURO[0])):
        b.ponto(x, y, c)
    # o avental pregueado: um trapézio de ouro com listras de lápis que desce entre as pernas
    for y in range(58, 63):
        meia = 4 + (y - 58) // 2
        for x in range(32 - meia, 32 + meia):
            listra = (x - 32) % 3 == 0
            b.ponto(x, y, LAPIS[2] if listra else (OURO[4] if x < 32 else OURO[3]))
        b.ponto(32 - meia - 1, y, OURO[0]); b.ponto(32 + meia, y, OURO[0])
    for x in range(26, 38):
        b.ponto(x, 63, OURO[0])


def pulseiras():
    """uma pulseira em cada pulso, dando a volta no braço de uma borda à outra"""
    for cx in (14.5, 49.5):
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 51, OURO, (LAPIS[2], LAPIS[1]))


if __name__ == "__main__":
    b.desenhar()
    colar()
    cinto_e_avental()
    pulseiras()
    with b.deslocado(b.CABECA_DESCE):
        toucado()
        uraeus()
    # o nemes esconde as orelhas: some o que sobrou delas para fora do pano
    b.img[b.peca_de == "orelha", 3] = 0
    b.conferencia("browramses")
