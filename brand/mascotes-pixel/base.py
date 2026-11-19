"""A base de pixel art dos 69 mascotes do RONDO: um browniezinho feito de dois quadrados separados, a cabeça (com orelhas
de urso, calda de chocolate escorrendo e o rosto) em cima do corpo (com bracinhos e perninhas).

Tudo é desenhado por código numa grade de 64 x 72 pixels, com paletas fixas (rampas de 6 tons), luz vindo de cima à
esquerda, volume calculado pela forma de cada peça (como uma almofada), contorno seletivo de 1 pixel, textura de bolo com
poros e migalhas e brilhos na calda. Rode com Python + Pillow + numpy:  python base.py
Gera em ./saida: a base inteira (pequena e ampliada 6x), a cabeça e o corpo separados e uma folha de conferência."""
import os
from contextlib import contextmanager

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "saida")
# o boneco é desenhado em coordenadas de 64 x 72; a tela tem folga em volta para os acessórios (chapéus, auréolas, asas)
OX, OY = 8, 16
W, H = 64 + 2 * OX, 72 + OY
AMPLIA = 6
# a cabeça vai de y=12 a y=41. Os acessórios de cabeça dos primeiros mascotes foram desenhados quando ela começava em
# y=8; eles são desenhados dentro de `deslocado(CABECA_DESCE)` para acompanhar a cabeça mais baixa.
CABECA_DESCE = 4

# ---------- paletas (do escuro para o claro) ----------
BROWNIE = [(52, 18, 14), (104, 38, 24), (150, 58, 34), (192, 84, 48), (222, 116, 66), (244, 156, 100)]
CALDA = [(26, 10, 8), (50, 22, 15), (78, 36, 23), (110, 56, 36), (150, 88, 60), (214, 172, 140)]
OLHO = [(20, 9, 12), (44, 24, 34), (70, 42, 58)]
BRANCO = (255, 250, 244)
BOCA = (70, 18, 16)
LINGUA = (214, 86, 82)
CONTORNO_FORA = (30, 10, 8)

LUZ = np.array([-0.55, -0.75, 0.9])
LUZ = LUZ / np.linalg.norm(LUZ)

yy, xx = np.mgrid[0:H, 0:W].astype(float)
yy -= OY   # coordenadas do desenho (o boneco começa em 0, 0)
xx -= OX
px, py = xx + 0.5, yy + 0.5   # centro de cada pixel
_dy = 0   # deslocamento vertical ativo (ver `deslocado`)

img = np.zeros((H, W, 4), np.uint8)
ocupado = np.zeros((H, W), bool)
peca_de = np.full((H, W), "", object)   # qual peça ficou em cada pixel


# ---------- formas ----------
def caixa(x0, y0, x1, y1, raio):
    """distância com sinal de um retângulo arredondado (negativa dentro), nas coordenadas de pixel (x1, y1 inclusos)"""
    cx, cy = (x0 + x1 + 1) / 2, (y0 + y1 + 1) / 2
    bx, by = (x1 + 1 - x0) / 2, (y1 + 1 - y0) / 2
    qx = np.abs(px - cx) - bx + raio
    qy = np.abs(py - cy) - by + raio
    fora = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
    return fora + np.minimum(np.maximum(qx, qy), 0) - raio


def bola(cx, cy, rx, ry=None):
    ry = ry or rx
    return (np.hypot((px - cx) / rx, (py - cy) / ry) - 1) * min(rx, ry)


def volume(d, chanfro):
    """altura de almofada a partir da distância à borda: sobe em quarto de círculo e fica plana no miolo"""
    t = np.clip(-d / chanfro, 0, 1)
    return np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1)) * chanfro


def luz_de(h, mascara, extra=0.0):
    gy, gx = np.gradient(np.where(mascara, h, 0.0))
    n = np.dstack([-gx, -gy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return (n @ LUZ) + extra


def tons(brilho, cortes):
    """transforma o brilho em índice da rampa (bandas limpas, sem pontilhado)"""
    return np.digitize(brilho, cortes)


def pintar(mascara, cor):
    img[mascara, :3] = cor
    img[mascara, 3] = 255
    ocupado[mascara] = True


def contorno(mascara, nome, linha=None):
    """contorno seletivo: escuro por fora; onde a peça passa por cima de outra, um tom mais claro (`linha`)"""
    viz = np.zeros_like(mascara)
    viz[1:] |= mascara[:-1]; viz[:-1] |= mascara[1:]; viz[:, 1:] |= mascara[:, :-1]; viz[:, :-1] |= mascara[:, 1:]
    borda = viz & ~mascara
    pintar(borda & ~ocupado, CONTORNO_FORA)
    pintar(borda & ocupado, linha or BROWNIE[0])
    peca_de[borda] = nome


def peca(nome, d, rampa, chanfro, cortes=(0.3, 0.5, 0.66, 0.86, 0.96), extra=None, linha=None):
    m = d <= 0
    contorno(m, nome, linha)
    h = volume(d, chanfro)
    b = luz_de(h, m, 0 if extra is None else extra)
    idx = np.clip(tons(b, cortes), 0, len(rampa) - 1)
    for i, c in enumerate(rampa):
        pintar(m & (idx == i), c)
    peca_de[m] = nome
    return m, idx


def escurecer(mascara, rampa, passos=1):
    """desce um tom da rampa nos pixels marcados (sombra projetada, poros)"""
    for y, x in zip(*np.nonzero(mascara)):
        c = tuple(img[y, x, :3])
        if c in rampa:
            img[y, x, :3] = rampa[max(0, rampa.index(c) - passos)]


def clarear(mascara, rampa, passos=1):
    for y, x in zip(*np.nonzero(mascara)):
        c = tuple(img[y, x, :3])
        if c in rampa:
            img[y, x, :3] = rampa[min(len(rampa) - 1, rampa.index(c) + passos)]


def ponto(x, y, cor):
    """um pixel nas coordenadas do desenho"""
    x, y = x + OX, y + OY + _dy
    if 0 <= x < W and 0 <= y < H:
        img[y, x, :3] = cor
        img[y, x, 3] = 255


@contextmanager
def deslocado(dy):
    """tudo o que for desenhado aqui dentro desce `dy` pixels (as coordenadas yy/py e `ponto` acompanham)"""
    global _dy
    yy[...] -= dy
    py[...] -= dy
    _dy += dy
    try:
        yield
    finally:
        yy[...] += dy
        py[...] += dy
        _dy -= dy


def textura_bolo(mascara, semente, evitar=None, densidade=0.06):
    """os poros do bolo (furinhos escuros de 1-2 pixels) e migalhas soltas (um pixel claro com a sombra embaixo)"""
    rng = np.random.default_rng(semente)
    miolo = mascara.copy()
    for _ in range(2):   # longe da borda, para não sujar o contorno
        miolo[1:] &= miolo[:-1]; miolo[:-1] &= miolo[1:]; miolo[:, 1:] &= miolo[:, :-1]; miolo[:, :-1] &= miolo[:, 1:]
    if evitar is not None:
        miolo &= ~evitar
    ys, xs = np.nonzero(miolo)
    escolha = rng.random(len(ys)) < densidade
    for y, x, ok in zip(ys, xs, escolha):
        if not ok:
            continue
        sorte = rng.random()
        if sorte < 0.55:   # poro
            escurecer(_px(y, x), BROWNIE)
            if rng.random() < 0.5 and miolo[y, min(x + 1, W - 1)]:
                escurecer(_px(y, x + 1), BROWNIE)
        elif sorte < 0.8 and miolo[min(y + 1, H - 1), x]:   # migalha saltada
            clarear(_px(y, x), BROWNIE)
            escurecer(_px(y + 1, x), BROWNIE)
        else:   # poro fundo
            escurecer(_px(y, x), BROWNIE, 2)


def _px(y, x):
    m = np.zeros((H, W), bool)
    if 0 <= y < H and 0 <= x < W:
        m[y, x] = True
    return m


def vestir(nome, d, rampa, chanfro, cortes=(0.3, 0.5, 0.66, 0.86, 0.96), extra=None, onde=None):
    """cobre uma peça já desenhada com outro material liso (roupa, pelo, metal): refaz a luz e a sombra da forma com a
    rampa nova, sem a textura de bolo, só nos pixels que ainda são daquela peça (o que está na frente dela continua)"""
    m = (d <= 0) & (peca_de == nome) & (img[..., 3] > 0)
    if onde is not None:
        m &= onde
    h = volume(d, chanfro)
    bril = luz_de(h, d <= 0, 0 if extra is None else extra)
    idx = np.clip(tons(bril, cortes), 0, len(rampa) - 1)
    for i, c in enumerate(rampa):
        img[m & (idx == i), :3] = c
    return m


def trocar(mascara, de, para):
    """repinta os pixels marcados de uma rampa para a outra, mantendo o tom (a luz e a sombra continuam no lugar)"""
    for y, x in zip(*np.nonzero(mascara)):
        c = tuple(int(v) for v in img[y, x, :3])
        if c in de:
            img[y, x, :3] = para[de.index(c)]


def faixa_envolvente(silhueta, y_base, rampa, filete=None, na_frente=None):
    """uma faixa (cinto, pulseira, punho) que dá a volta numa peça redonda: ocupa a largura inteira da peça naquela
    altura, curva um pixel para baixo no meio, tem luz à esquerda e sombra à direita, linha escura em cima e embaixo, um
    filete opcional (par de cores: claro, escuro) embaixo e as pontas arredondadas e escuras nas bordas, como se sumisse
    por trás. Só pinta onde `na_frente` deixa (o que estiver na frente da peça continua na frente)."""
    linha = silhueta[y_base + OY]
    xs = [x - OX for x in np.nonzero(linha)[0]]
    if not xs:
        return
    x0, x1 = min(xs), max(xs)
    meio, meia = (x0 + x1 + 1) / 2, (x1 + 1 - x0) / 2
    for x in range(x0 - 1, x1 + 2):
        t = (x + 0.5 - meio) / meia
        y0 = y_base + (1 if abs(t) < 0.5 else 0)
        if x < x0 or x > x1:
            pares = [(y0, rampa[0]), (y0 + 1, rampa[0])]
        else:
            if t < -0.6:
                c1, c2 = rampa[3], rampa[2]
            elif t < 0.0:
                c1, c2 = rampa[5], rampa[4]
            elif t < 0.6:
                c1, c2 = rampa[4], rampa[3]
            else:
                c1, c2 = rampa[2], rampa[1]
            pares = [(y0 - 1, rampa[0]), (y0, c1), (y0 + 1, c2)]
            if abs(t) > 0.85:   # perto da borda a faixa afina (está virando para trás)
                pares = [(y0 - 1, rampa[0]), (y0, c2), (y0 + 1, filete[1] if filete else rampa[1])]
            elif filete:
                pares.append((y0 + 2, filete[0] if t < 0.3 else filete[1]))
            pares.append((pares[-1][0] + 1, rampa[0]))
        for y, cor in pares:
            if na_frente is None or na_frente[y + OY, x + OX]:
                ponto(x, y, cor)


def pena(rx0, ry0, ang, comp, larg, rampa, linha):
    """uma pena: elipse comprida girada, nascendo na raiz (rx0, ry0) e apontando no ângulo (graus, 0 = para fora)"""
    dx, dy = np.cos(np.radians(ang)), -np.sin(np.radians(ang))
    cx, cy = rx0 + dx * comp * 0.55, ry0 + dy * comp * 0.55
    u = (px - cx) * dx + (py - cy) * dy
    v = -(px - cx) * dy + (py - cy) * dx
    d = (np.hypot(u / (comp / 2), v / larg) - 1) * larg
    peca("asa", d, rampa, 1.8, cortes=(0.3, 0.45, 0.6, 0.74, 0.94), linha=linha)
    return cx, cy, dx, dy


def asas_de_penas(rampa, centro=31.5, escala=1.0):
    """duas asas abertas para cima e para fora, por trás do corpo: as penas compridas em leque (das de baixo para as
    de cima, cada uma com o seu contorno e o veio claro) e as penas pequenas cobrindo a raiz. Desenhe dentro de
    `desenhar(atras=...)`."""
    for lado in (-1, 1):
        rx0, ry0 = centro + lado * 14, 46
        for ang, comp, larg in ((-14, 18, 2.8), (6, 23, 3.0), (26, 26, 3.2), (46, 25, 3.2), (66, 20, 3.0)):
            a = ang if lado > 0 else 180 - ang
            comp *= escala
            cx, cy, dx, dy = pena(rx0, ry0, a, comp, larg, rampa, rampa[1])
            for t in np.linspace(-0.1, 0.38, 6):
                ponto(int(round(cx + dx * comp * t)), int(round(cy + dy * comp * t)), rampa[5])
        for ang, comp, larg in ((8, 12, 3.4), (32, 13, 3.6), (56, 12, 3.4)):
            a = ang if lado > 0 else 180 - ang
            pena(rx0, ry0, a, comp * escala, larg, rampa, rampa[2])


def felpudo(d, amp=0.6):
    """deixa a beira de uma forma ondulada, como pelo"""
    return d + amp * np.sin(px * 1.9) * np.cos(py * 1.7)


def tufos(mascara, rampa, semente, densidade=0.12):
    """tufinhos de pelo: pixels um tom mais escuros espalhados no miolo"""
    rng = np.random.default_rng(semente)
    ys, xs = np.nonzero(mascara)
    for y, x in zip(ys, xs):
        if rng.random() < densidade:
            escurecer(_px(y, x), rampa)


# ---------- montagem ----------
def desenhar(atras=None):
    """desenha a base. `atras` desenha o que fica atrás do boneco (asas, capas, auras). As cores vêm das rampas BROWNIE e
    CALDA deste módulo; um mascote de outra cor troca as rampas antes de chamar (ex.: base.BROWNIE = OURO)."""
    if atras:
        atras()
    # pernas
    pernas = []
    for x0 in (21, 35):
        m, _ = peca("perna", caixa(x0, 58, x0 + 7, 67, 3), BROWNIE, 2.5)
        pernas.append(m)
        # sola um tom mais escura e o vão entre os dedinhos
        escurecer(m & (yy == 67), BROWNIE)
        ponto(x0 + 4, 67, BROWNIE[1])
    # corpo: o quadrado de baixo
    d_corpo = caixa(16, 40, 47, 62, 5)
    corpo, _ = peca("corpo", d_corpo, BROWNIE, 4.0, extra=-0.05 * (yy - 40) / 22)
    # a barriguinha: um tom mais claro e macio no meio
    textura_bolo(corpo, 3, densidade=0.07)
    # bracinhos: gotas de bolo que nascem dos lados, um pouco abertos
    for cx, lado in ((14.5, -1), (49.5, 1)):
        m, _ = peca("braco", bola(cx, 50, 4.2, 5.6), BROWNIE, 3.0)
        # dobrinha da mão
        ponto(int(cx) + (1 if lado < 0 else -1), 53, BROWNIE[2])
        textura_bolo(m, 7 + lado, densidade=0.05)
    # orelhas (atrás da cabeça)
    for cx in (15.0, 49.0):
        m, _ = peca("orelha", bola(cx, 11.0, 6.5), BROWNIE, 4.0)
        dentro = bola(cx + (0.8 if cx < 32 else -0.8), 11.4, 3.4, 3.2) <= 0
        pintar(dentro, BROWNIE[1])
        pintar(dentro & (bola(cx + (0.8 if cx < 32 else -0.8), 12.4, 2.4, 2.2) <= 0), BROWNIE[0])
        ponto(int(cx) - 2, 7, BROWNIE[5])
    # cabeça: o quadrado de cima, maior que o corpo
    d_cab = caixa(11, 12, 52, 41, 8)
    cabeca, _ = peca("cabeca", d_cab, BROWNIE, 5.0, extra=-0.06 * (yy - 12) / 29)
    # sombra que a cabeça joga no corpo (as duas linhas logo abaixo dela)
    sob = corpo & (yy >= 42) & (yy <= 43) & (px > 18) & (px < 46)
    escurecer(sob, BROWNIE)
    escurecer(corpo & (yy == 42) & (px > 22) & (px < 42), BROWNIE)

    # calda de chocolate no alto da cabeça, escorrendo em gotas de tamanhos diferentes
    beira = 18 + 1.2 * np.sin(px * 0.55) + 0.8 * np.sin(px * 1.3 + 1)
    gotas = [(15, 3.0, 5), (21, 2.5, 2), (27, 3.2, 3), (37, 2.6, 2), (43, 3.0, 3), (48, 2.4, 5)]
    calda = cabeca & (py <= beira)
    for gx, larg, comp in gotas:
        haste = (np.abs(px - gx) <= larg / 2) & (py <= 18 + comp)
        ponta = np.hypot(px - gx, py - (18 + comp)) <= larg / 2 + 0.4
        calda |= cabeca & (haste | ponta)
    # sombra da calda no bolo: uma linha escura logo abaixo da beira
    sob_calda = cabeca & ~calda & np.roll(calda, 1, 0)
    escurecer(sob_calda, BROWNIE, 2)
    h_cab = volume(d_cab, 5.0)
    bril = luz_de(h_cab, cabeca, 0.04)
    idx = np.clip(tons(bril, (0.4, 0.6, 0.78, 0.92, 0.99)), 0, 5)
    for i, c in enumerate(CALDA[:5]):
        pintar(calda & (idx == i), c)
    # espessura da calda: borda de baixo um tom mais escura
    beirada = calda & ~np.roll(calda, -1, 0)
    escurecer(beirada, CALDA)
    # brilhos da calda: um risco comprido no alto à esquerda, pontinhos nas gotas
    for x in range(16, 26):
        ponto(x, 14 + (1 if x > 21 else 0), CALDA[5])
    for x in range(17, 21):
        ponto(x, 14, BRANCO)
    for x in (39, 40, 41):
        ponto(x, 15, CALDA[5])
    ponto(45, 16, CALDA[5])
    for gx, larg, comp in gotas:   # reflexo no lado esquerdo de cada gota
        if comp >= 4:
            ponto(int(gx - larg / 2 + 0.5), 18 + comp - 2, CALDA[4])

    # textura do bolo na cabeça (fora da calda e do rosto)
    rosto = (caixa(18, 22, 45, 37, 4) <= 0)
    textura_bolo(cabeca & ~calda, 5, evitar=rosto, densidade=0.06)
    # luz de recorte: um fio claro no lado direito da cabeça
    rec = cabeca & ~calda & ~np.roll(cabeca, -2, 1) & np.roll(cabeca, -1, 1) & (yy > 20) & (yy < 36)
    clarear(rec, BROWNIE)

    # ---------- rosto ----------
    for cx in (22.5, 41.5):
        olho = bola(cx, 28.5, 3.6, 4.6) <= 0
        pintar(olho, OLHO[0])
        pintar(olho & (bola(cx, 31.2, 2.6, 2.0) <= 0), OLHO[1])   # reflexo do chão, embaixo
        pintar(olho & (bola(cx + 0.3, 32.0, 1.6, 1.0) <= 0), OLHO[2])
        # um brilho só, grande, no alto à esquerda
        bx, by = int(cx - 2), 25
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            ponto(bx + dx, by + dy, BRANCO)
        # pálpebra de cima mais escura que o bolo em volta
        topo = (bola(cx, 28.5, 4.4, 5.4) <= 0) & ~olho & (py < 27) & cabeca
        escurecer(topo, BROWNIE)
    # boquinha: um sorriso de 'w' com a linguinha
    # narizinho de urso: um triângulo escuro arredondado com brilho
    for x in (30, 31, 32, 33):
        ponto(x, 31, CALDA[0])
    for x in (31, 32):
        ponto(x, 32, CALDA[0])
    ponto(30, 31, CALDA[2]); ponto(31, 31, CALDA[3])
    # boca aberta sorrindo, com a linguinha
    ponto(31, 33, BOCA); ponto(32, 33, BOCA)
    for x, y in ((27, 33), (28, 34), (29, 34), (30, 34), (33, 34), (34, 34), (35, 34), (36, 33)):
        ponto(x, y, BOCA)
    for x in (29, 30, 31, 32, 33, 34):
        ponto(x, 35, BOCA)
    for x in (30, 31, 32, 33):
        ponto(x, 36, BOCA)
    for x in (31, 32, 33):
        ponto(x, 35, LINGUA)
    ponto(31, 34, BOCA); ponto(32, 34, BOCA)

    return cabeca, corpo


def conferencia(nome):
    """salva o boneco (tamanho real e ampliado 6x) e uma folha para conferir: no escuro, no claro e em 1x, 2x e 3x"""
    os.makedirs(SAIDA, exist_ok=True)
    sprite = Image.fromarray(img, "RGBA")
    sprite.save(os.path.join(SAIDA, f"{nome}.png"))
    grande = sprite.resize((W * AMPLIA, H * AMPLIA), Image.NEAREST)
    grande.save(os.path.join(SAIDA, f"{nome}_x6.png"))
    alto = max(H * AMPLIA + 40, H * 6 + 80)
    folha = Image.new("RGBA", (W * AMPLIA * 2 + 60 + W * 3 + 40, alto), (22, 22, 28, 255))
    folha.paste(Image.new("RGBA", (W * AMPLIA + 20, alto), (236, 232, 226, 255)), (W * AMPLIA + 30, 0))
    folha.alpha_composite(grande, (20, 20))
    folha.alpha_composite(grande, (W * AMPLIA + 40, 20))
    x, y = W * AMPLIA * 2 + 70, 20
    for k in (1, 2, 3):
        folha.alpha_composite(sprite.resize((W * k, H * k), Image.NEAREST), (x, y))
        y += H * k + 16
    folha.save(os.path.join(SAIDA, f"{nome}_conferencia.png"))
    cores = {tuple(c) for c in img.reshape(-1, 4) if c[3]}
    print(nome, sprite.size, len(cores), "cores")


def salvar():
    os.makedirs(SAIDA, exist_ok=True)
    cabeca, corpo = desenhar()
    base = Image.fromarray(img, "RGBA")
    base.save(os.path.join(SAIDA, "base.png"))
    base.resize((W * AMPLIA, H * AMPLIA), Image.NEAREST).save(os.path.join(SAIDA, "base_x6.png"))
    # as peças separadas: a cabeça (com orelhas e calda) e o corpo (com braços e pernas)
    alto = np.zeros((H, W), bool)
    for nome in ("cabeca", "orelha"):
        alto |= peca_de == nome
    for nome, mascara in (("cabeca", alto), ("corpo", ~alto & (img[..., 3] > 0))):
        p = img.copy()
        p[~mascara, 3] = 0
        Image.fromarray(p, "RGBA").resize((W * AMPLIA, H * AMPLIA), Image.NEAREST).save(os.path.join(SAIDA, f"{nome}_x6.png"))
    # folha de conferência: ampliada no escuro e no claro, e nos tamanhos reais do app
    grande = base.resize((W * AMPLIA, H * AMPLIA), Image.NEAREST)
    folha = Image.new("RGBA", (W * AMPLIA * 2 + 60 + 260, H * AMPLIA + 40), (22, 22, 28, 255))
    folha.paste(Image.new("RGBA", (W * AMPLIA + 20, H * AMPLIA + 40), (236, 232, 226, 255)), (W * AMPLIA + 30, 0))
    folha.alpha_composite(grande, (20, 20))
    folha.alpha_composite(grande, (W * AMPLIA + 40, 20))
    x = W * AMPLIA * 2 + 70
    y = 30
    for k in (1, 2, 3):
        folha.alpha_composite(base.resize((W * k, H * k), Image.NEAREST), (x, y))
        y += H * k + 16
    folha.save(os.path.join(SAIDA, "conferencia.png"))
    cores = {tuple(c) for c in img.reshape(-1, 4) if c[3]}
    print("base", base.size, len(cores), "cores")


if __name__ == "__main__":
    salvar()
