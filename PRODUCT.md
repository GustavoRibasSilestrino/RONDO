# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Dois públicos de peso igual, confirmados pelo dono do produto:
- **Praticantes**: quem treina e quer constância, comparando-se com a própria versão de ontem. Usam o app no celular no dia a dia (Hoje, Treino, Dieta, Evolução, Comunidade, Recado de voz, Perfil).
- **Profissionais verificados** (personais, nutricionistas): cadastram-se pelo site e atendem dentro da plataforma.

## Product Purpose
Yesteryou ("Compita com quem você foi ontem") reúne treino, dieta, constância, comunidade e profissionais verificados numa só assinatura. Sucesso: o praticante mantém a rotina e vê a própria evolução; o profissional é encontrado e confiável.

## Positioning
Tudo num só lugar: treino, dieta, comunidade, recado de voz e profissionais verificados integrados numa única assinatura, com a comparação "Você vs. Yesteryou" como eixo (decisão confirmada: o diferencial é a integração; o eixo de comparação com o próprio passado vem do README).

## Operating Context
- Site (`vitrine/`, HTML/CSS/JS puros, sem build, no ar em https://yesteryou.vercel.app): apresenta o produto; assinatura e cadastro de profissionais acontecem aqui.
- App (`app/`, React Native + Expo + TypeScript): não tem cadastro, só entrada com a conta criada no site; modo demonstração local sem API.
- Backend (`backend/`, Python + FastAPI): regras de treino (1RM) por ora; dieta, pontos, assinaturas, webhooks e IA entram depois.
- Idioma: português do Brasil.

## Capabilities and Constraints
- Regras de produto em `app/src/lib/calc.ts`: força estimada (Epley), progressão dupla de carga, estagnação, meta calórica (Mifflin-St Jeor com piso de segurança), streak com uma folga por semana, pontos do ranking, comparação "Você vs. Yesteryou".
- Navegação do app: uma roda de ícones no pé da tela.
- Em aberto: identificador definitivo do app nas lojas, armazenamento seguro do token, dados reais de comunidade e ranking.
- `site/` (React/Vite) está sem uso; `index.html` na raiz é protótipo visual do celular.

## Brand Commitments
Restrições visuais já ditas pelo dono e vinculantes (registradas, não expandidas):
- Preto e roxo, fontes finas (Inter Tight 200/300), minimalista, nada com cara de IA.
- Sem eyebrow labels sobre títulos, sem faixa marquee.
- Logo: apenas o símbolo "YY" branco, fundo transparente (`brand/yesteryou-simbolo.svg|png`).
- No celular, navegação por roda em arco; toque no ícone abre a seção direto.

## Evidence on Hand
Código funcional do site, app e backend; símbolo da marca em `brand/`. Não há depoimentos, clientes, números de uso ou preços confirmados: não inventar.

## Product Principles
1. A comparação é com o seu eu de ontem, não com os outros.
2. Um só lugar: treino, dieta e profissionais não viram produtos separados.
3. Constância antes de intensidade: regras como a folga semanal no streak protegem o hábito.
4. Profissionais são verificados; confiança é parte do produto.

## Accessibility & Inclusion
Nenhum requisito específico estabelecido ainda.
