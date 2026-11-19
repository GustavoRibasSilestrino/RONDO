"""Browcaubói (comum, linha 0, coluna 8): o caubói. Chapéu de couro de aba larga com as pontas viradas para cima, copa
com o vinco no alto e a fita dourada; colete de couro aberto na frente com franjas, e o cinto com a fivela grande de
ouro.  python browcauboi.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

COURO = [(46, 22, 10), (84, 42, 18), (124, 66, 30), (160, 94, 44), (196, 128, 66), (226, 166, 100)]
COURO_ESCURO = [(30, 14, 8), (56, 28, 14), (84, 44, 22), (112, 62, 32), (140, 84, 46), (172, 112, 66)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)


def chapeu():
    # a copa: da largura da cabeça inteira, alta, com os cantos arredondados e o vinco afundado no meio do alto
    copa = np.maximum(b.caixa(12, -4, 51, 14, 7), -b.bola(31.5, -6.5, 7.5, 4.6))
    m, _ = b.peca("chapeu", copa, COURO, 3.0, cortes=CORTES, linha=COURO[0])
    # as beiras do vinco, um tom mais escuras
    vinco = m & (b.bola(31.5, -6.5, 9.0, 6.0) <= 0)
    b.escurecer(vinco, COURO)
    # a fita dourada na base da copa, com uma fivelinha
    for x in range(12, 52):
        b.ponto(x, 10, OURO[4] if x < 32 else OURO[3])
        b.ponto(x, 11, OURO[2])
        b.ponto(x, 12, OURO[1])
    for x, y, c in ((20, 10, OURO[0]), (21, 10, OURO[0]), (20, 12, OURO[0]), (21, 12, OURO[0]), (20, 11, OURO[5]),
                    (21, 11, OURO[0]), (19, 11, OURO[0]), (22, 11, OURO[0])):
        b.ponto(x, y, c)
    # a aba: larga, passando das orelhas, com as pontas viradas para cima
    t = (b.px - 31.5) / 34.0
    meio = 15.5 - 6.0 * t ** 4
    aba = np.maximum(np.abs(b.py - meio) - 2.2, np.abs(b.px - 31.5) - 34.0)
    am, _ = b.peca("chapeu", aba, COURO, 1.8, cortes=CORTES, linha=COURO[0])
    # a beira de baixo da aba mais escura (a parte de baixo, na sombra) e a costura de cima clara
    baixo = am & ~np.roll(am, -1, 0)
    b.trocar(baixo, COURO, COURO_ESCURO)
    b.escurecer(am & (np.abs(t) > 0.85), COURO)
    # sombra larga da aba no rosto
    for y, passos in ((18, 2), (19, 1), (20, 1)):
        sombra = (b.yy == y) & (b.peca_de == "cabeca")
        b.escurecer(sombra, b.BROWNIE, passos)
        b.escurecer(sombra, b.CALDA, passos)


def colete():
    """o colete de couro, aberto na frente (a barriga de bolo aparece no meio), com franjas na barra"""
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    for lado in (-1, 1):
        # a borda da frente desce em diagonal, abrindo para baixo
        borda = 31.5 + lado * (2.5 + (b.py - 41) * 0.25)
        painel = (lado * (b.px - borda) >= 0) & (b.yy <= 53)
        b.vestir("corpo", d_corpo, COURO_ESCURO, 4.0, extra=-0.05 * (b.yy - 40) / 22, onde=painel)
        # a costura da borda da frente, clara
        for y in range(42, 54):
            x = int(round(31.5 + lado * (2.5 + (y + 0.5 - 41) * 0.25))) - (1 if lado < 0 else 0)
            b.ponto(x, y, COURO[4] if lado < 0 else COURO[3])
        # as franjas penduradas na barra, um fio a cada 2 pixels
        for y_f in (54, 55):
            for x in range(17, 47):
                if lado * (x + 0.5 - (31.5 + lado * (2.5 + 13 * 0.25))) >= 0 and x % 2 == 0:
                    if y_f == 55 and x % 4 == 0:
                        continue
                    b.ponto(x, y_f, COURO[2] if y_f == 54 else COURO[1])
    b.escurecer((b.peca_de == "corpo") & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), COURO_ESCURO)


def cinto():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 57, COURO, None, livre)
    # a fivela grande de ouro, oval, com um desenho de estrela no meio
    fivela = b.bola(31.5, 58.0, 4.6, 2.9)
    m, _ = b.peca("fivela", fivela, OURO, 1.4, cortes=CORTES, linha=OURO[0])
    b.escurecer(m & (b.bola(31.5, 58.0, 3.0, 1.6) <= 0) & (b.bola(31.5, 58.0, 2.2, 1.0) > 0), OURO)
    for x, y in ((31, 57), (32, 57), (30, 58), (33, 58), (31, 58), (32, 58), (31, 59), (32, 59)):
        b.ponto(x, y, OURO[4])
    b.ponto(29, 57, OURO[5])


if __name__ == "__main__":
    b.desenhar()
    colete()
    cinto()
    chapeu()
    b.img[b.peca_de == "orelha", 3] = 0   # o chapéu cobre as orelhas
    b.conferencia("browcauboi")
