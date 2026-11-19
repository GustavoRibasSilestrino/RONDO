"""Browfogo (raro, linha 2, coluna 4): o fogo. Labaredas finas e pontudas em volta da cabeça por trás (vermelho por fora,
laranja e amarelo no miolo, cada língua com a sua luz e sombra), a coroa de chamas no alto da cabeça, faíscas e brasas
voando; roupa de magma com as rachaduras acesas, a chama amarela subindo no peito, os punhos em brasa e a sola dos pés
acesa.  python browfogo.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

VERMELHO = [(70, 6, 6), (140, 20, 10), (200, 44, 16), (236, 84, 24), (250, 128, 40), (255, 170, 70)]
LARANJA = [(150, 40, 6), (220, 90, 14), (248, 140, 24), (255, 182, 46), (255, 214, 90), (255, 236, 150)]
AMARELO = [(220, 130, 10), (250, 190, 30), (255, 222, 70), (255, 240, 130), (255, 250, 190), (255, 255, 240)]
MAGMA = [(26, 10, 10), (48, 18, 16), (72, 28, 22), (100, 40, 28), (130, 56, 34), (160, 76, 44)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def chama(cx, base, alt, larg, balanco=0.0):
    """distância de uma labareda: gorda embaixo, afinando até a ponta, que balança para o lado"""
    t = (base - b.py) / alt                      # 0 na base, 1 na ponta
    meia = larg * np.clip(1 - t, 0, 1) ** 0.75 * np.clip(0.55 + t * 2.2, 0, 1)
    eixo = cx + balanco * np.clip(t, 0, 1) ** 2
    d = np.abs(b.px - eixo) - meia
    return np.maximum(d, np.maximum(-t * alt, (t - 1) * alt))


def labaredas(lista, nome="fogo"):
    """desenha as labaredas em três camadas (vermelha por fora, laranja e o miolo amarelo), cada uma com volume"""
    for rampa, escala in ((VERMELHO, 1.0), (LARANJA, 0.66), (AMARELO, 0.36)):
        d = np.full(b.img.shape[:2], 99.0)
        for cx, base, alt, larg, bal in lista:
            for lado in ((1,) if cx == MEIO else (1, -1)):
                x = MEIO + lado * (cx - MEIO)
                d = np.minimum(d, chama(x, base, alt * (0.35 + 0.65 * escala), larg * escala, bal * lado))
        b.peca(nome, d, rampa, 2.0, cortes=CORTES, linha=VERMELHO[0] if rampa is VERMELHO else None)


def aura():
    """as labaredas por trás da cabeça e dos ombros, espelhadas: mais línguas, de alturas diferentes"""
    labaredas([(MEIO, 22.0, 30.0, 11.0, 0.0), (20.0, 24.0, 27.0, 8.0, -3.0), (11.0, 32.0, 25.0, 7.0, -5.0),
               (7.0, 46.0, 18.0, 6.0, -4.0)])
    # as brasas no ar atrás da cabeça, espelhadas
    global FUNDO_AURA
    FUNDO_AURA = (b.img.copy(), b.peca_de.copy())   # guardado para tapar o buraco das orelhas depois


def coroa():
    """a coroa de chamas no alto da cabeça, na frente: a grande no meio e as menores abrindo para os lados"""
    labaredas([(MEIO, 18.0, 18.0, 7.0, 0.0), (24.5, 16.0, 12.0, 4.2, -2.5), (16.5, 17.0, 10.0, 3.8, -3.0)], "topete")


def faiscas():
    """faíscas e brasas voando em volta, espelhadas: as amarelas brilham mais, as laranja estão apagando"""
    for x, y, c in ((2, 8, 4), (-2, 26, 3), (11, -6, 4), (24, -10, 3), (-4, 40, 2)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, AMARELO[c])
    for x, y in ((-5, 18), (3, 52)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, LARANJA[1])
    # uma faísca maior em cruz de cada lado
    for x0, y0 in ((-1, 2),):
        for xx in (x0, 63 - x0):
            b.ponto(xx, y0, AMARELO[5])
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                b.ponto(xx + dx, y0 + dy, AMARELO[2])


def roupa():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, MAGMA, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # as rachaduras acesas no magma, espelhadas, com o brilho em volta
    for pts in (((18, 47), (19, 48), (20, 48), (21, 49), (22, 49)), ((19, 56), (20, 55), (21, 55), (22, 54)),
                ((24, 60), (25, 59)), ((26, 43), (27, 44))):
        for x, y in pts:
            for xx in (x, 63 - x):
                b.ponto(xx, y, LARANJA[3])
                if corpo[y + 1 + b.OY, xx + b.OX]:
                    b.ponto(xx, y + 1, MAGMA[4])
    # a chama amarela subindo no meio do peito, com as duas chaminhas dos lados
    d = np.minimum(chama(MEIO, 61.0, 16.0, 6.0), np.minimum(chama(27.0, 61.0, 10.0, 3.6, -1.0), chama(37.0, 61.0, 10.0, 3.6, 1.0)))
    for rampa, encolhe in ((VERMELHO, 0.0), (LARANJA, 1.2), (AMARELO, 2.6)):
        m = corpo & (d <= -encolhe)
        b.pintar(m, rampa[3])
        b.pintar(m & (b.px < MEIO), rampa[4])
    b.pintar(corpo & (d > 0) & (d <= 1.0) & (b.py > 50), MAGMA[5])   # o brilho do fogo no magma em volta
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), MAGMA, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, LARANJA)
    for x0 in (21, 35):
        m = b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), MAGMA, 2.5)
        b.pintar(m & (b.yy == 65), LARANJA[2])
        b.pintar(m & (b.yy == 66), VERMELHO[3])


if __name__ == "__main__":
    b.desenhar(atras=aura)
    roupa()
    b.img[b.peca_de == "orelha", 3] = 0   # as orelhas somem no fogo
    # tapa o buraco que as orelhas deixaram: onde ficou vazio, volta o fogo que estava atrás delas
    vazio = b.img[..., 3] == 0
    b.img[vazio] = FUNDO_AURA[0][vazio]
    b.peca_de[vazio] = FUNDO_AURA[1][vazio]
    with b.deslocado(b.CABECA_DESCE):
        coroa()
    faiscas()
    b.conferencia("browfogo")
