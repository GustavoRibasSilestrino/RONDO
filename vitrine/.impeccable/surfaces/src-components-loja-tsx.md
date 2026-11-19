---
version: 1
slug: "src-components-loja-tsx"
primary_target: "src/components/Loja.tsx"
related_targets: ["src/components/LojaPromo.tsx","src/components/LojaAbrir.tsx"]
---

# Loja de pacotinhos (/loja), divulgação na home e ícone no topo

Escopo: a página `/loja`, a seção que divulga a loja na home (no lugar da antiga segunda tela, as pastas de treino) e o botão da tenda no cabeçalho. Modo do visitante: Persuade.

Público e ação: quem visita o site do RONDO, quase sempre no celular. A ação é escolher um pacotinho no balcão, ver as chances e comprar (hoje uma demonstração, sem cobrança). Prova: a arte do dono (tenda, 3 pacotes, 69 mascotes) e as chances de cada raridade à vista.

Restrições: sem pagamento real; aviso de prévia e de 18+; 69 mascotes, chances somando 100%; fontes e imagens servidas pelo próprio site (CSP); respeitar movimento reduzido.

Momento memorável: o pacote rasga devagar, um clarão amarelo forte toma a tela e o browniezinho aparece.

Em aberto: gateway de pagamento, checagem de idade, onde o mascote fica guardado, nomes dos 75 mascotes.

## Direction contract

THESIS: a loja é a própria barraca. Compra-se no balcão: os pacotes em cima do balcão são os botões, a placa de madeira carrega o nome, as etiquetas penduradas dizem o preço. Recusa o arranjo padrão de loja (grade de cartões de produto sobre o degradê da marca).

OWN-WORLD: direção fixada pelo pedido do dono (feira em pixel art). Paleta tirada da arte: madeira (#8a4a1c, #c47a35, #4a220e), toldo vermelho e creme (#d62b2f, #f6dfb8), amarelo de lanterna (#ffc83d), noite roxa como chão fora da cena (#120a26), contorno quase preto (#1b0d06). Tipos de pixel: Pixelify Sans para ler, Press Start 2P para preço e botão. Bordas em degraus de pixel, sombra em bloco, sem cantos arredondados. Raridade tem cor, nome e estrelas.

STORY: a pessoa vê a barraca, entende que cada pacotinho sorteia um browniezinho, compara as chances, compra na prévia, assiste ao pacote rasgar e quer abrir outro ou criar a conta.

FIRST VIEWPORT: barra de pixel no alto (voltar ao site e criar conta). Logo abaixo, a cena da barraca na largura toda; a placa de cima diz PACOTINHOS; três pacotes em pé no balcão, cada um com a etiqueta de nome e preço; tocar num pacote abre a tela de compra. No celular a cena é recortada no centro e os pacotes continuam com pelo menos 44 px.

FORM: barraca de feira, fixada pelo pedido (sem sorteio de direção). seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
