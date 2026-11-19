"""Browpirata (incomum, linha 1, coluna 8): o pirata. Chapéu de três bicos preto com a beira dourada e a caveira com os
ossos cruzados; casaco vermelho de capitão com a gola de babado branco, os botões e a barra de ouro, o cinturão com
fivela, e um papagaio verde no ombro.  python browpirata.py"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

PRETO = [(8, 8, 12), (20, 18, 26), (36, 32, 44), (56, 52, 66), (90, 86, 104), (150, 146, 166)]
VERMELHO = [(64, 8, 12), (116, 16, 22), (164, 28, 32), (202, 46, 44), (230, 82, 70), (248, 126, 108)]
OURO = [(104, 56, 10), (164, 96, 20), (214, 146, 30), (246, 192, 54), (255, 224, 118), (255, 248, 204)]
BRANCO = [(120, 116, 136), (176, 172, 192), (218, 216, 230), (240, 238, 248), (251, 250, 255), (255, 255, 255)]
VERDE = [(10, 50, 20), (24, 96, 36), (40, 146, 50), (76, 190, 70), (130, 226, 110), (190, 250, 170)]
CORTES = (0.3, 0.45, 0.6, 0.74, 0.94)
MEIO = 32.0


def chapeu():
    # a copa, por trás da aba
    copa = np.maximum(b.bola(MEIO, 9.0, 17.0, 10.0), b.py - 12)
    b.peca("chapeu", copa, PRETO, 3.0, cortes=CORTES, linha=PRETO[0])
    # a caveira e os ossos cruzados, brancos, na frente da copa
    caveira = ["0111110", "1111111", "1011101", "1111111", "0110110", "0101010"]
    for j, linha in enumerate(caveira):
        for i, c in enumerate(linha):
            if c == "1":
                b.ponto(29 + i, 1 + j, BRANCO[5] if i < 4 else BRANCO[3])
    for k in range(7):   # os dois ossos em X atrás da caveira
        for x, y in ((26 + k, 7 + k // 2), (37 - k, 7 + k // 2)):
            if not (29 <= x <= 35 and y <= 6):
                b.ponto(x, y, BRANCO[4])
    # a aba de três bicos: as pontas dos lados viram para cima, a da frente desce um pouco no meio
    t = (b.px - MEIO) / 26.0
    topo = 9.0 - 10.0 * t ** 2
    baixo = 16.0 - 3.0 * t ** 2
    aba = np.maximum(np.maximum(topo - b.py, b.py - baixo), np.abs(b.px - MEIO) - 26.0)
    m, _ = b.peca("chapeu", aba, PRETO, 1.8, cortes=CORTES, linha=PRETO[0])
    # a beira dourada em cima da aba
    beira = m & ~np.roll(m, 1, 0)
    b.pintar(beira, OURO[3])
    b.pintar(np.roll(beira, 1, 0) & m, OURO[1])
    b.pintar(beira & (b.px < MEIO), OURO[4])
    # sombra da aba na testa
    for y, passos in ((17, 2), (18, 1), (19, 1)):
        sombra = (b.yy == y) & (b.peca_de == "cabeca")
        b.escurecer(sombra, b.BROWNIE, passos)
        b.escurecer(sombra, b.CALDA, passos)


def casaco():
    d_corpo = b.caixa(16, 40, 47, 62, 5)
    corpo = b.vestir("corpo", d_corpo, VERMELHO, 4.0, extra=-0.05 * (b.yy - 40) / 22)
    b.escurecer(corpo & (b.yy >= 42) & (b.yy <= 43) & (b.px > 18) & (b.px < 46), VERMELHO)
    for cx in (14.5, 49.5):
        b.vestir("braco", b.bola(cx, 50, 4.2, 5.6), VERMELHO, 3.0, onde=b.yy <= 52)
        b.faixa_envolvente(b.bola(cx, 50, 4.2, 5.6) <= 0, 50, OURO)
    # a gola de babado branco no meio do peito (o jabô), em ondinhas descendo
    for y in range(42, 52):
        meia = 3 if y < 47 else 2
        for x in range(32 - meia, 32 + meia):
            onda = (y + (x < 32)) % 2 == 0
            b.ponto(x, y, BRANCO[4] if onda else BRANCO[2])
        b.ponto(32 - meia - 1, y, OURO[3]); b.ponto(32 + meia, y, OURO[2])   # as bordas de ouro do casaco
    # os botões de ouro dos dois lados
    for y in (44, 48):
        for x in (25, 37):   # pares de pixels espelhados
            b.ponto(x, y, OURO[4]); b.ponto(x + 1, y, OURO[2]); b.ponto(x, y + 1, OURO[1]); b.ponto(x + 1, y + 1, OURO[0])
    # o cinturão de couro preto com a fivela de ouro quadrada
    livre = ~((b.peca_de == "braco") & (b.img[..., 3] > 0))
    b.faixa_envolvente(d_corpo <= 0, 54, PRETO, None, livre)
    for x in range(28, 36):
        for y in range(53, 59):
            borda = x in (28, 35) or y in (53, 58)
            dentro = x in (29, 34) or y in (54, 57)
            if borda:
                b.ponto(x, y, OURO[0])
            elif dentro:
                b.ponto(x, y, OURO[4] if (x < 32 and y < 56) else OURO[2])
            else:
                b.ponto(x, y, PRETO[2])
    # a barra de ouro do casaco
    b.faixa_envolvente(d_corpo <= 0, 60, OURO, None, livre)


def papagaio():
    """um papagaio verde pousado no ombro esquerdo, olhando para o rosto, com o bico amarelo e o rabo vermelho e azul"""
    for x, y, c in ((53, 46, (200, 40, 40)), (54, 47, (200, 40, 40)), (55, 46, (50, 90, 210)), (55, 47, (50, 90, 210)),
                    (54, 48, (200, 40, 40)), (56, 48, (50, 90, 210))):
        b.ponto(x, y, c)
    b.peca("papagaio", b.bola(54.5, 41.0, 3.4, 4.4), VERDE, 2.0, cortes=CORTES, linha=VERDE[0])
    b.peca("papagaio", b.bola(54.0, 35.5, 2.9, 2.7), VERDE, 1.6, cortes=CORTES, linha=VERDE[0])
    # a asa, mais escura, com a ponta vermelha
    for x, y in ((55, 39), (56, 40), (56, 41), (57, 42), (56, 43)):
        b.ponto(x, y, VERDE[1])
    b.ponto(57, 43, (200, 40, 40))
    # o bico curvo, virado para o rosto, e o olhinho
    for x, y, c in ((51, 35, (250, 200, 50)), (50, 35, (250, 200, 50)), (50, 36, (200, 140, 30)), (51, 36, (230, 170, 40)),
                    (49, 36, (40, 30, 20))):
        b.ponto(x, y, c)
    b.ponto(53, 34, b.OLHO[0]); b.ponto(53, 33, BRANCO[5])
    # os pezinhos segurando o ombro
    b.ponto(53, 45, (230, 150, 60)); b.ponto(55, 45, (230, 150, 60))


if __name__ == "__main__":
    b.desenhar()
    casaco()
    b.img[b.peca_de == "orelha", 3] = 0   # o chapéu cobre as orelhas
    chapeu()
    papagaio()
    b.conferencia("browpirata")
