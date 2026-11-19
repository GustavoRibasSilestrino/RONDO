"""Browmagma (épico, linha 3, coluna 12): o magma. O browniezinho é de rocha vulcânica escura e a calda virou lava
escorrendo, laranja e amarela; os olhos acesos como lava; as rachaduras de lava acesas na cabeça e no corpo; as
chaminhas saindo das orelhas; a poça de lava borbulhando com as labaredas em volta dos pés e as brasas subindo.  python browmagma.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

BASALTO = [(20, 14, 24), (40, 30, 46), (60, 46, 68), (82, 64, 90), (106, 84, 114), (138, 114, 144)]
LAVA = [(110, 20, 6), (180, 50, 10), (230, 100, 20), (250, 150, 40), (255, 200, 80), (255, 236, 150)]
VERMELHO = [(70, 6, 6), (140, 20, 10), (200, 44, 16), (236, 84, 24), (250, 128, 40), (255, 170, 70)]
AMARELO = [(220, 130, 10), (250, 190, 30), (255, 222, 70), (255, 240, 130), (255, 250, 190), (255, 255, 240)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def chama(cx, base, alt, larg, balanco=0.0):
    t = (base - b.py) / alt
    meia = larg * np.clip(1 - t, 0, 1) ** 0.75 * np.clip(0.55 + t * 2.2, 0, 1)
    eixo = cx + balanco * np.clip(t, 0, 1) ** 2
    d = np.abs(b.px - eixo) - meia
    return np.maximum(d, np.maximum(-t * alt, (t - 1) * alt))


def labaredas(lista, nome):
    """as labaredas em três camadas (vermelha por fora, laranja e o miolo amarelo), espelhadas"""
    for rampa, escala in ((VERMELHO, 1.0), (LAVA, 0.66), (AMARELO, 0.36)):
        d = np.full(b.img.shape[:2], 99.0)
        for cx, base, alt, larg, bal in lista:
            for lado in ((1,) if cx == MEIO else (1, -1)):
                x = MEIO + lado * (cx - MEIO)
                d = np.minimum(d, chama(x, base, alt * (0.35 + 0.65 * escala), larg * escala, bal * lado))
        b.peca(nome, d, rampa, 2.0, cortes=CORTES, linha=VERMELHO[0] if rampa is VERMELHO else None)


def rachaduras():
    """as rachaduras de lava acesas, espelhadas: o miolo amarelo e a beira laranja"""
    linhas = (((16, 30), (17, 31), (18, 31), (19, 32), (19, 33)),          # na bochecha
              ((14, 22), (15, 23), (15, 24)),                              # na lateral da cabeça
              ((19, 47), (20, 48), (21, 48), (22, 49), (22, 50), (23, 51)),  # no peito
              ((20, 56), (21, 55), (22, 55), (23, 56)),                    # na barriga
              ((13, 50), (14, 51)))                                        # no braço
    for pts in linhas:
        for x, y in pts:
            for xx in (x, 63 - x):
                if b.img[y + b.OY, xx + b.OX, 3] > 0:
                    b.ponto(xx, y, AMARELO[3])
                    if b.img[y + 1 + b.OY, xx + b.OX, 3] > 0:
                        b.ponto(xx, y + 1, LAVA[2])


def poca():
    """a poça de lava em volta dos pés, com as labaredas subindo e as bolhas"""
    labaredas([(MEIO, 68.0, 10.0, 6.0, 0.0), (24.0, 68.0, 12.0, 5.0, -1.5), (15.0, 68.0, 13.0, 5.5, -3.0),
               (8.0, 68.0, 9.0, 4.0, -3.0)], "fogo")
    d = b.bola(MEIO, 67.0, 26.0, 2.4)
    m, _ = b.peca("poca", d, LAVA, 1.4, cortes=CORTES, linha=VERMELHO[0])
    for x in (12, 20, 27):   # as bolhas, espelhadas
        for xx in (x, 63 - x):
            b.ponto(xx, 66, AMARELO[4]); b.ponto(xx, 67, LAVA[1])


def chaminhas():
    """as chaminhas saindo das orelhas, espelhadas"""
    labaredas([(15.0, 9.0, 9.0, 2.6, -1.5)], "chaminha")


def brasas():
    for x, y, c in ((3, 30, 4), (-2, 46, 3), (6, 6, 3), (11, -4, 4), (0, 18, 2)):
        for xx in (x, 63 - x):
            b.ponto(xx, y, AMARELO[c])


if __name__ == "__main__":
    b.BROWNIE = BASALTO
    b.CALDA = LAVA
    b.OLHO = [(120, 30, 6), (226, 104, 20), (255, 196, 70)]   # os olhos acesos como lava (na rocha escura sumiam)
    b.desenhar()
    rachaduras()
    poca()
    with b.deslocado(b.CABECA_DESCE):
        chaminhas()
    brasas()
    b.conferencia("browmagma")
