"""Junta os mascotes em pixel art: redesenha todos, separa as imagens por raridade e monta a folha do site.

- saida/por-raridade/<n>-<raridade>/<numero>-<nome>.png (o tamanho original, 80x88) e <numero>-<nome>_x6.png (ampliado)
- a folha do site: 14 colunas x 5 linhas, uma linha por raridade, na mesma ordem e nas mesmas casas da folha antiga
  (as casas dos mascotes tirados ficam vazias), cada célula com o mascote ampliado 2x sem borrar (160x176). Ela vai
  direto para o site (vitrine/src/assets/loja/mascotes.webp) e para o app (app/assets/mascotes.webp), em webp sem perda.

Os nomes e as casas vêm de vitrine/src/data/loja.ts (NOMES), para nunca ficarem diferentes do site.
python montar_folha.py"""
import json
import os
import re
import subprocess
import sys
import unicodedata

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
LOJA_TS = os.path.join(RAIZ, "vitrine", "src", "data", "loja.ts")
FOLHA_SITE = os.path.join(RAIZ, "vitrine", "src", "assets", "loja", "mascotes.webp")
FOLHA_APP = os.path.join(RAIZ, "app", "assets", "mascotes.webp")
FOLHA_APP_CINZA = os.path.join(RAIZ, "app", "assets", "mascotes-cinza.webp")
RARIDADES = ("comum", "incomum", "rara", "epica", "lendaria")
ESCALA = 2
W, H = 80, 88


def nomes_do_site():
    """lê a lista NOMES de loja.ts (uma lista por raridade, null nas casas tiradas)"""
    texto = open(LOJA_TS, encoding="utf-8").read()
    bloco = re.search(r"export const NOMES[^=]*=\s*(\[.*?\n\]);", texto, re.S).group(1)
    return json.loads(re.sub(r",\s*\]", "]", bloco))


def arquivo_de(nome):
    """'Browcaubói' -> 'browcauboi' (o nome do arquivo .py do mascote)"""
    sem_acento = unicodedata.normalize("NFD", nome).encode("ascii", "ignore").decode()
    return sem_acento.lower()


def main():
    nomes = nomes_do_site()
    # 1) redesenha todos, para a folha sair com a versão aprovada de cada um
    for linha in nomes:
        for nome in linha:
            if nome:
                arq = arquivo_de(nome)
                subprocess.run([sys.executable, "-I", os.path.join(AQUI, arq + ".py")], cwd=AQUI, check=True,
                               stdout=subprocess.DEVNULL)
    # 2) separa por raridade e 3) monta a folha
    folha = Image.new("RGBA", (14 * W * ESCALA, 5 * H * ESCALA), (0, 0, 0, 0))
    numero = 0
    for i, linha in enumerate(nomes):
        pasta = os.path.join(AQUI, "saida", "por-raridade", f"{i + 1}-{RARIDADES[i]}")
        os.makedirs(pasta, exist_ok=True)
        for f in os.listdir(pasta):
            os.remove(os.path.join(pasta, f))
        for coluna, nome in enumerate(linha):
            if not nome:
                continue
            numero += 1
            arq = arquivo_de(nome)
            img = Image.open(os.path.join(AQUI, "saida", arq + ".png")).convert("RGBA")
            assert img.size == (W, H), (nome, img.size)
            img.save(os.path.join(pasta, f"{numero:02d}-{arq}.png"))
            img.resize((W * 6, H * 6), Image.NEAREST).save(os.path.join(pasta, f"{numero:02d}-{arq}_x6.png"))
            folha.paste(img.resize((W * ESCALA, H * ESCALA), Image.NEAREST), (coluna * W * ESCALA, i * H * ESCALA))
    for destino in (FOLHA_SITE, FOLHA_APP):
        folha.save(destino, "WEBP", lossless=True, quality=100, method=6)
    cinza(folha).save(FOLHA_APP_CINZA, "WEBP", lossless=True, quality=100, method=6)
    print(f"{numero} mascotes; folha {folha.size} em {FOLHA_SITE} e {FOLHA_APP} (e a cinza em {FOLHA_APP_CINZA})")


def cinza(folha):
    """a mesma folha em tons de cinza (o app mostra assim os mascotes que a conta ainda não tem): o brilho de cada pixel
    vira cinza, um pouco mais apagado e com menos contraste, e a transparência continua a mesma"""
    rgb, alfa = folha.convert("RGB"), folha.getchannel("A")
    l = rgb.convert("L").point(lambda v: int(60 + v * 0.55))
    return Image.merge("RGBA", (l, l, l, alfa))


if __name__ == "__main__":
    main()
