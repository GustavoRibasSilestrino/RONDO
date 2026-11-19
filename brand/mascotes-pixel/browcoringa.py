"""Browcoringa (raro, linha 2, coluna 5): o bobo da corte. Chapéu de bobo com três pontas moles (as dos lados laranja,
caindo para fora, a do meio roxa, em pé) e um guizo de ouro em cada ponta, a faixa roxa com os losangos de ouro; nariz
vermelho de palhaço; gola de babado em ziguezague roxo e ouro; roupa de arlequim em losangos roxos e laranja com
pompons de ouro; estrelinhas de malabarismo voando em volta.  python browcoringa.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

ROXO = [(34, 10, 64), (64, 22, 116), (100, 40, 166), (138, 66, 206), (176, 106, 236), (216, 160, 255)]
LARANJA = [(110, 30, 6), (180, 60, 12), (230, 96, 24), (250, 140, 40), (255, 184, 80), (255, 222, 140)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
NARIZ = [(90, 0, 10), (170, 10, 24), (220, 30, 40), (246, 70, 70), (255, 130, 120), (255, 200, 190)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def tubo(pontos):
    d = np.full(b.img.shape[:2], 99.0)
    for (x0, y0, r0), (x1, y1, r1) in zip(pontos, pontos[1:]):
        for t in np.linspace(0, 1, 12):
            d = np.minimum(d, b.bola(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t))
    return d


def guizo(cx, cy):
    b.peca("guizo", b.bola(cx, cy, 2.4), OURO, 1.4, cortes=CORTES, linha=OURO[0])
    b.ponto(int(np.floor(cx)) - 1, int(np.floor(cy)) - 1, OURO[5])
    b.ponto(int(np.floor(cx)), int(np.floor(cy)) + 1, OURO[0])


def chapeu():
    # as pontas dos lados, laranja: sobem e caem para fora, espelhadas
    for lado in (-1, 1):
        def x(v):
            return MEIO + lado * (v - MEIO)
        pts = [(x(22.0), 9.0, 6.0), (x(15.0), 1.0, 4.6), (x(7.0), -1.0, 3.4), (x(1.5), 4.0, 2.4), (x(0.5), 10.0, 1.6)]
        b.peca("chapeu", tubo(pts), LARANJA, 2.6, cortes=CORTES, linha=LARANJA[0])
        for v, y in ((14.0, 0.0), (9.0, -1.5), (16.0, 1.0)):   # pintinhas
            b.ponto(int(x(v)) - (1 if lado > 0 else 0), int(y), LARANJA[4])
    # a ponta do meio, roxa, em pé com a pontinha caindo para a frente
    b.peca("chapeu", tubo([(MEIO, 9.0, 7.0), (MEIO, 0.0, 5.0), (MEIO, -7.0, 3.0), (MEIO, -10.0, 2.0)]), ROXO, 3.0,
           cortes=CORTES, linha=ROXO[0])
    for y in (-4, 1, 5):   # losangos de ouro descendo na ponta do meio
        b.ponto(31, y, OURO[4]); b.ponto(32, y, OURO[2])
        b.ponto(31, y + 1, OURO[2]); b.ponto(32, y + 1, OURO[1])
    for x0 in (0.5, 63.5):
        guizo(x0, 12.0)
    guizo(MEIO, -12.0)
    # a faixa roxa da testa, com os losangos de ouro espelhados
    faixa = b.caixa(12, 9, 51, 15, 3)
    b.peca("chapeu", faixa, ROXO, 2.0, cortes=CORTES, linha=ROXO[0])
    for x in (17, 24):
        for xx in (x, 63 - x - 1):
            b.ponto(xx, 11, OURO[4]); b.ponto(xx + 1, 11, OURO[3])
            b.ponto(xx, 12, OURO[3]); b.ponto(xx + 1, 12, OURO[1])
    b.ponto(31, 11, OURO[4]); b.ponto(32, 11, OURO[3]); b.ponto(31, 12, OURO[3]); b.ponto(32, 12, OURO[1])
    sombra = (b.yy == 16) & (b.peca_de == "cabeca")
    b.escurecer(sombra, b.CALDA)
    b.escurecer(sombra, b.BROWNIE)


def nariz():
    """o nariz vermelho de palhaço, por cima do narizinho de urso"""
    b.peca("nariz", b.bola(MEIO, 31.0, 2.3, 1.9), NARIZ, 1.4, cortes=CORTES, linha=NARIZ[0])
    b.ponto(30, 30, NARIZ[5])


def roupa():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, ROXO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    # os losangos de arlequim: alterna roxo e laranja, espelhados no meio
    u = (np.abs(b.px - MEIO) + (b.py - 40.0)) / 8.0
    v = (np.abs(b.px - MEIO) - (b.py - 40.0)) / 8.0
    laranja = corpo & ((np.floor(u) + np.floor(v)) % 2 == 0)
    b.trocar(laranja, ROXO, LARANJA)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), LARANJA if cx < MEIO else ROXO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 52, OURO)
    for x0 in (21, 35):
        b.vestir("perna", b.caixa(x0, 58, x0 + 7, 67, 3), ROXO if x0 < 30 else LARANJA, 2.5)
    # os pompons de ouro descendo no meio
    for y in (52, 57):
        b.peca("pompom", b.bola(MEIO, y + 0.5, 1.8), OURO, 1.2, cortes=CORTES, linha=OURO[0])
    # a gola de babado em ziguezague, roxo e ouro, dando a volta no pescoço
    for x in range(17, 47):
        dente = abs(((x - 17) % 4) - 1.5) < 1.0
        fundo = 44 + (2 if dente else 0)
        for y in range(41, fundo + 1):
            claro = (x < 32)
            b.ponto(x, y, (OURO[4] if claro else OURO[3]) if y == fundo else ((ROXO[4] if claro else ROXO[3]) if y < 43 else
                         OURO[2]))
        b.ponto(x, fundo + 1, OURO[0])


def estrelas():
    """as estrelinhas de malabarismo voando em volta, espelhadas"""
    estrela = ["00100", "01110", "11111", "01110", "01010"]
    for x0, y0 in ((-6, 22), (-3, 38)):
        for lado in (0, 1):
            for j, linha in enumerate(estrela):
                for i, c in enumerate(linha):
                    if c == "1":
                        x = x0 + i if lado == 0 else 63 - (x0 + i)
                        b.ponto(x, y0 + j, OURO[4] if j < 2 else OURO[3])


if __name__ == "__main__":
    b.desenhar()
    roupa()
    b.img[b.peca_de == "orelha", 3] = 0   # o chapéu cobre as orelhas
    with b.deslocado(b.CABECA_DESCE):
        chapeu()
    nariz()   # o rosto da base não desce com a cabeça
    estrelas()
    b.conferencia("browcoringa")
