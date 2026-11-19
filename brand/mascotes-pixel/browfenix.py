"""Browfênix (épico, linha 3, coluna 0): a fênix. Capuz de ave de fogo com o bico dourado curto em cima do rosto e a
crista de três plumas de chama (a do meio alta, as dos lados curvando para fora), o rosto à mostra numa abertura de
cantos arredondados; asas abertas de penas de fogo por trás, as duas plumas compridas da cauda; roupa de penas em
escamas laranja e ouro com a joia de brasa no peito; faíscas subindo.  python browfenix.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

FOGO = [(110, 24, 6), (190, 60, 10), (236, 110, 20), (252, 160, 40), (255, 206, 80), (255, 240, 160)]
ASA = [(110, 16, 8), (190, 46, 14), (236, 96, 24), (252, 150, 40), (255, 204, 90), (255, 240, 170)]
VERMELHO = [(70, 6, 6), (140, 20, 10), (200, 44, 16), (236, 84, 24), (250, 128, 40), (255, 170, 70)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
AMARELO = [(220, 130, 10), (250, 190, 30), (255, 222, 70), (255, 240, 130), (255, 250, 190), (255, 255, 240)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def chama(cx, base, alt, larg, balanco=0.0):
    """uma pluma de chama: gorda embaixo, afinando até a ponta, que curva para o lado"""
    t = (base - b.py) / alt
    meia = larg * np.clip(1 - t, 0, 1) ** 0.75 * np.clip(0.55 + t * 2.2, 0, 1)
    eixo = cx + balanco * np.clip(t, 0, 1) ** 2
    d = np.abs(b.px - eixo) - meia
    return np.maximum(d, np.maximum(-t * alt, (t - 1) * alt))


def plumas(lista, nome):
    """as plumas em três camadas: vermelha por fora, laranja e o miolo amarelo, cada uma com volume"""
    for rampa, escala in ((VERMELHO, 1.0), (FOGO, 0.66), (AMARELO, 0.36)):
        d = np.full(b.img.shape[:2], 99.0)
        for cx, base, alt, larg, bal in lista:
            for lado in ((1,) if cx == MEIO else (1, -1)):
                x = MEIO + lado * (cx - MEIO)
                d = np.minimum(d, chama(x, base, alt * (0.35 + 0.65 * escala), larg * escala, bal * lado))
        b.peca(nome, d, rampa, 2.0, cortes=CORTES, linha=VERMELHO[0] if rampa is VERMELHO else None)


def atras():
    b.asas_de_penas(ASA, centro=MEIO, escala=0.95)
    # as duas plumas compridas da cauda saindo por baixo, curvando para fora
    for lado in (-1, 1):
        caminho = [(MEIO + lado * 6, 60, 2.6), (MEIO + lado * 14, 65, 2.2), (MEIO + lado * 22, 66, 1.8),
                   (MEIO + lado * 28, 62, 1.2), (MEIO + lado * 30, 57, 0.6)]
        d = np.full(b.img.shape[:2], 99.0)
        for (x0, y0, r0), (x1, y1, r1) in zip(caminho, caminho[1:]):
            for t in np.linspace(0, 1, 12):
                d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
        m, _ = b.peca("cauda", d, ASA, 1.6, cortes=CORTES, linha=VERMELHO[0])


def capuz():
    abertura = b.caixa(16, 21, 47, 40, 5)
    d = np.maximum(b.caixa(8, 5, 55, 44, 11), -abertura)
    m, _ = b.peca("capuz", d, FOGO, 4.0, cortes=CORTES, linha=VERMELHO[0])
    # as peninhas do capuz: pequenos V mais escuros, espelhados
    for x, y in ((12, 14), (11, 24), (12, 34), (19, 9), (25, 8)):
        for xx in (x, 63 - x):
            s = 1 if xx < 32 else -1
            b.ponto(xx, y, FOGO[1]); b.ponto(xx + s, y + 1, FOGO[1]); b.ponto(xx - s, y + 1, FOGO[1])
            b.ponto(xx, y - 1, FOGO[5])
    b.clarear(m & (abertura <= 1.6), FOGO)
    sombra = (abertura <= 0) & (abertura > -1.4) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.BROWNIE)
    b.escurecer(sombra, b.CALDA)
    # o bico dourado curto, em cima do rosto, apontando para baixo (para na beira, longe dos olhos)
    bico = ["11111111", "11111111", "01111110", "00111100", "00011000"]
    for j, linha in enumerate(bico):
        for i, c in enumerate(linha):
            if c == "1":
                b.ponto(28 + i, 15 + j, OURO[4] if i < 4 else OURO[2])
    bm = np.zeros(b.img.shape[:2], bool)
    for j, linha in enumerate(bico):
        for i, c in enumerate(linha):
            if c == "1":
                bm[15 + j + b.OY, 28 + i + b.OX] = True
    b.contorno(bm, "bico", OURO[0])
    for x in range(29, 35):
        b.ponto(x, 17, OURO[1]) if x in (29, 34) else None


def roupa():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, FOGO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # as penas em escamas: fileiras de arquinhos mais escuros, espelhadas
    for y0 in (47, 52, 57):
        for x0 in (19, 24, 29):
            for xx0 in (x0, 63 - x0 - 3):
                for i, dy in enumerate((1, 0, 0, 1)):
                    x = xx0 + i
                    if corpo[y0 + dy + b.OY, x + b.OX]:
                        b.ponto(x, y0 + dy, FOGO[1] if dy else FOGO[4])
    peito = corpo & (np.abs(b.px - MEIO) < 7.5 - (b.py - 44) * 0.2) & (b.py > 43)
    b.vestir("corpo", d_corpo, VERMELHO, 4.0, onde=peito)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), FOGO, 3.0)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, OURO)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), OURO, 2.5)   # as perninhas de ave, douradas
    # a joia de brasa no peito, num engaste de ouro
    b.peca("joia", b.bola(MEIO, 47.5, 3.0, 2.6), OURO, 1.4, cortes=CORTES, linha=OURO[0])
    b.peca("joia", b.bola(MEIO, 47.5, 1.7, 1.5), VERMELHO, 1.0, cortes=(0.2, 0.4, 0.6, 0.8, 0.95), linha=VERMELHO[0])
    b.ponto(31, 47, AMARELO[5])


def faiscas():
    for x, y, c in ((0, 10, 4), (4, 2, 3), (-6, 22, 3), (9, -8, 4), (21, -14, 3), (-4, 44, 2)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, AMARELO[c])


if __name__ == "__main__":
    b.desenhar(atras=atras)
    roupa()
    b.img[b.peca_de == "orelha", 3] = 0   # o capuz cobre as orelhas
    plumas([(MEIO, 9.0, 23.0, 6.5, 0.0), (23.5, 9.0, 18.0, 5.2, -8.0), (15.5, 10.0, 14.0, 4.4, -8.0)], "crista")
    capuz()
    faiscas()
    b.conferencia("browfenix")
