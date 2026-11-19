"""Browtrevas (lendário, linha 4, coluna 7): as trevas. O browniezinho feito de sombra (violeta quase preto), com os
olhos acesos em âmbar; a coroa de obsidiana de pontas acesas em magenta; as asas de penas negras por trás com a beira
magenta; as chamas sombrias magenta e roxas subindo dos lados; a corrente de ouro com o pingente de ametista.
python browtrevas.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

SOMBRA = [(10, 6, 18), (22, 14, 36), (36, 24, 56), (52, 36, 78), (72, 52, 102), (100, 76, 134)]
CALDA_SOMBRA = [(4, 2, 8), (12, 8, 22), (22, 14, 38), (34, 22, 56), (50, 34, 78), (110, 80, 150)]
PENA = [(8, 4, 16), (20, 12, 34), (34, 22, 54), (52, 34, 78), (110, 40, 130), (200, 80, 210)]
OBSIDIANA = [(6, 4, 12), (16, 10, 28), (28, 20, 44), (44, 32, 64), (64, 50, 90), (96, 80, 124)]
MAGENTA = [(90, 6, 90), (160, 20, 160), (220, 60, 210), (250, 120, 240), (255, 180, 250), (255, 230, 255)]
ROXO = [(40, 6, 70), (80, 20, 130), (126, 44, 190), (166, 80, 230), (200, 130, 250), (230, 190, 255)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
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


def chama(cx, base, alt, larg, balanco=0.0):
    t = (base - b.py) / alt
    meia = larg * np.clip(1 - t, 0, 1) ** 0.75 * np.clip(0.55 + t * 2.2, 0, 1)
    eixo = cx + balanco * np.clip(t, 0, 1) ** 2
    d = np.abs(b.px - eixo) - meia
    return np.maximum(d, np.maximum(-t * alt, (t - 1) * alt))


def atras():
    # as asas de penas negras, com a beira magenta
    b.asas_de_penas(PENA, centro=MEIO, escala=0.95)
    asa = (b.peca_de == "asa") & (b.img[..., 3] > 0)
    beira = asa & ~(np.roll(asa, 1, 0) & np.roll(asa, -1, 0) & np.roll(asa, 1, 1) & np.roll(asa, -1, 1))
    b.pintar(beira & (b.py < 46), MAGENTA[2])
    # as chamas sombrias dos lados, espelhadas: roxo por fora, magenta e o miolo claro
    lista = [(9.0, 64.0, 22.0, 7.0, -4.0), (5.0, 50.0, 16.0, 5.0, -4.0)]
    for rampa, escala in ((ROXO, 1.0), (MAGENTA, 0.62), (MAGENTA[3:] + MAGENTA[3:], 0.3)):
        d = np.full(b.img.shape[:2], 99.0)
        for cx, base, alt, larg, bal in lista:
            for lado in (1, -1):
                x = MEIO + lado * (cx - MEIO)
                d = np.minimum(d, chama(x, base, alt * (0.35 + 0.65 * escala), larg * escala, bal * lado))
        b.peca("chama", d, rampa, 2.0, cortes=CORTES, linha=ROXO[0] if rampa is ROXO else None)


def coroa():
    """a coroa de obsidiana com as pontas acesas em magenta"""
    pontas = [(18.5, -4.13, 3.6), (25.0, -7.13, 3.6), (MEIO, -12.13, 4.4), (39.0, -7.13, 3.6), (45.5, -4.13, 3.6)]
    d = b.caixa(16, 4, 47, 11, 1)
    for cx, topo, larg in pontas:
        d = np.minimum(d, poligono([(cx - larg, 5.0), (cx, topo), (cx + larg, 5.0)]))
    m, _ = b.peca("coroa", d, OBSIDIANA, 1.8, cortes=CORTES, linha=MAGENTA[1])
    for cx, topo, larg in pontas:   # a ponta acesa em magenta, com o fio de luz
        acesa = m & (b.py < topo + 5.0)
        b.pintar(acesa, MAGENTA[2])
        b.pintar(acesa & (np.abs(b.px - cx) < 0.6), MAGENTA[4])
    for x in range(16, 48):
        b.ponto(x, 5, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 10, OURO[2] if x < 32 else OURO[1])
    for x in (21, 27):   # as pedrinhas magenta no aro, espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, 8, MAGENTA[3])
    b.ponto(31, 8, OURO[4]); b.ponto(32, 8, OURO[3])


def corrente():
    for k in range(6):
        y = 45 + k
        b.ponto(25 + k, y, OURO[4] if k % 2 else OURO[2])
        b.ponto(38 - k, y, OURO[4] if k % 2 else OURO[2])
    pedra = poligono([(MEIO, 50.0), (MEIO + 2.6, 53.0), (MEIO, 57.0), (MEIO - 2.6, 53.0)]) <= 0
    b.contorno(pedra, "pingente", OURO[0])
    b.pintar(pedra, ROXO[3])
    b.pintar(pedra & (b.px < MEIO), ROXO[4])
    b.pintar(pedra & (b.px >= MEIO) & (b.py > 53), ROXO[2])
    b.ponto(31, 52, ROXO[5])


if __name__ == "__main__":
    b.BROWNIE = SOMBRA
    b.CALDA = CALDA_SOMBRA
    b.OLHO = [(150, 70, 10), (240, 150, 30), (255, 220, 110)]   # os olhos acesos em âmbar
    b.desenhar(atras=atras)
    corrente()
    with b.deslocado(b.CABECA_DESCE):
        coroa()
    b.conferencia("browtrevas")
