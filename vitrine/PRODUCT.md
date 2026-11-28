# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Pessoas no Brasil que treinam (academia, casa, rua) e querem constância: acompanhar treino, dieta, água e evolução, e se comparar com a própria versão de ontem. Falam português (o RONDIN também fala inglês e espanhol). Entram pelo celular, em sessões curtas. Há menores de idade entre os usuários, com autorização de responsável (LGPD, art. 14). Existe ainda um público profissional (nutricionistas e personal trainers verificados por CRN/CREF).

## Product Purpose
O RONDO é um app de treino, dieta, constância e comunidade, com recados de voz para o "eu do futuro" e profissionais verificados. O site (esta pasta, `vitrine/`) divulga o app, leva à criação de conta e hospeda as páginas legais. Sucesso do site: a pessoa entende a proposta em segundos e cria a conta ou abre o app.

## Positioning
"Compita com quem você foi ontem": o rival é a própria versão anterior, não outras pessoas. O RONDIN, agente conversacional com voz, é quem entra, cadastra e acompanha a pessoa. Nenhum app de treino vizinho tem o recado de voz para o eu do futuro nem o RONDIN como porta de entrada.

## Operating Context
Site estático em Vite + React 19 + TypeScript, publicado na Vercel (`https://userondo.vercel.app`); o app fica em `/app`; a API (FastAPI) fica no Render. Push na `main` publica tudo. Os cabeçalhos de segurança do site fixam `font-src 'self'` e `img-src 'self' data: blob:`: fontes e imagens precisam ser servidas pelo próprio site, nunca por CDN.

## Capabilities and Constraints
- Planos hoje no site: Grátis, PRO e Profissional. Preços vivem em `vitrine/src/data/`.
- **Loja de pacotinhos (nova, 2026-11-18):** o dono quer uma loja no site com três pacotes à venda (roxo, prata, ouro). Cada pacote sorteia um mascote ("browniezinho") entre 69 mascotes em 5 raridades (13 comuns e 14 em cada uma das outras: incomum, rara, épica, lendária). É o que existe na folha de arte de fundo transparente que o dono mandou em 2026-11-18. Pacotes melhores têm chances melhores de raridade alta; lendário é quase impossível no pacote inicial.
- **2026-11-19:** o dono pediu para tirar o Browdiabinho (incomum, linha 1, coluna 6) de tudo. Agora são **68 mascotes** (13 comuns, 13 incomuns e 14 em cada outra raridade). A casa dele na folha fica vazia, para as chaves dos outros mascotes não mudarem; o servidor não sorteia mais ele e a coleção não mostra.
- **2026-11-19 (depois):** o dono pediu para tirar também o Browinferno (épico, linha 3, coluna 5). Agora são **67 mascotes** (13 comuns, 13 incomuns, 14 raros, 13 épicos e 14 lendários), com a casa dele vazia do mesmo jeito.
- **2026-11-19 (mais tarde):** o dono pediu para tirar também o Browdemônio (lendário, linha 4, coluna 10). Agora são **66 mascotes** (13 comuns, 13 incomuns, 14 raros, 13 épicos e 13 lendários), com a casa dele vazia do mesmo jeito.
- Decisões confirmadas para a loja: (1) **não há pagamento real ainda**: COMPRAR roda uma **demonstração sem cobrança**, com aviso claro de pré-visualização; (2) **as chances de cada raridade ficam à vista em cada pacote**, com aviso de que a compra real será só para maiores de 18 anos (o sorteio pago pode ser restrito a menores pela ECA Digital, Lei 15.211/2025); (3) os textos dizem o número real de mascotes (**69**) e as chances somam sempre 100%.
- Em aberto: gateway de pagamento, login para validar a idade, onde o mascote sorteado fica guardado (conta do usuário) e se os mascotes aparecem no app.
- Os preços dos pacotes são **estimativas** do dono ("bem acessíveis"), ainda não validadas com ninguém.
- **Desde 2026-11-27 a loja vende cada mascote separado, sem sorteio** (pedido do dono, depois de saber que pacote pago com prêmio sorteado é caixa de recompensa, proibida pelo ECA Digital em produtos que menores provavelmente usam). A pessoa escolhe o mascote e paga o preço da raridade dele (estimativas, um pouco mais caras desde 2026-11-28: comum R$ 2,99, incomum R$ 3,99, rara R$ 5,99, épica R$ 9,99, lendária R$ 12,99). O sorteio ficou só nas recompensas grátis do app. O cenário da loja é a floresta ao pôr do sol em pixel art, arte do dono; os mascotes ficam em quadros escuros com a luz da raridade para se destacarem dela. Os itens acima sobre pacotes e chances são o histórico.

## Brand Commitments
Nome RONDO; símbolo em `public/assets/logo/`; o RONDIN (esfera de pontos, em vídeo 3D e canvas). Fotos de paisagem em pixel art do dono (`src/assets/cenas/`). A loja segue a mesma linguagem de pixel art das paisagens. Tudo em português do Brasil, sem emoji como ícone.

## Evidence on Hand
Arte do dono para a loja (a copiar para `src/assets/loja/`): tenda 16:9, ícone da tenda, 3 pacotes, folha com 69 mascotes de fundo transparente (a primeira folha, com 75 sobre um xadrez desenhado, foi trocada por ela) e uma tabela "Pacotinhos". Não há depoimentos, clientes nem números de venda: nada disso pode ser inventado. A tabela do dono diz "100 mascotes" e soma 99% de chances; isso está errado frente à folha (69 mascotes) e não deve ir ao ar.

## Product Principles
1. Compita com ontem: tudo reforça a constância, não a comparação com os outros.
2. Transparência: nada de promessa que o produto não cumpre; sorteio mostra as chances.
3. O RONDIN é a porta de entrada: caminhos de entrar e criar conta passam por ele.
4. Segurança e privacidade de menores primeiro (LGPD, ECA Digital).

## Accessibility & Inclusion
Respeitar `prefers-reduced-motion`; alvos de toque de 44 px; contraste mínimo AA; navegação por teclado completa; nenhuma informação só por cor (raridade tem nome e estrelas).
