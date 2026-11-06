# Conformidade legal do RONDO

O que já está no código e o que ainda depende do responsável. Não é parecer jurídico: os documentos do site
(`/privacidade`, `/termos`, `/reembolso`, `/suboperadores`, `/licencas`, `/direitos-autorais`) precisam da revisão de um advogado.

## Já feito

- **Documentos**: Política de Privacidade, Termos de Uso, Cancelamento e reembolso, Suboperadores, Licenças e créditos, Direitos autorais (`vitrine/src/components/Legal.tsx`).
- **Aceite registrado**: o cadastro exige marcar os Termos e a Privacidade (inclui o consentimento para dados de saúde). Cada aceite vira uma linha na tabela `consentimentos`, com tipo, versão, data e origem.
- **Marketing separado**: caixa própria, desmarcada por padrão; liga e desliga no app (Configurações > Privacidade e dados) ou pela rota `PATCH /me/marketing`. Cada mudança é registrada. Hoje o RONDO não envia nenhum e-mail de marketing.
- **Menores de idade**: data de nascimento no cadastro; abaixo de 18 anos, o cadastro exige nome, e-mail e a autorização do responsável (registrada em `consentimentos`).
- **Direitos do titular**: `GET /me/exportar` (cópia de tudo) e `DELETE /me` (apaga a conta e tudo dela, inclusive fotos no Storage), com botões no app.
- **Retenção**: stories somem do banco em 24 h; avisos em 180 dias (`backend/app/servicos/conta.py`). Prazos em `backend/app/legal.py`.
- **Cookies**: aviso com aceitar e recusar do mesmo tamanho; nada opcional liga sem escolha (`vitrine/src/lib/consentimento.ts`). Hoje não há nenhum rastreador. As fontes do site são servidas pelo próprio site (sem Google Fonts).
- **Textos enganosos corrigidos**: "profissionais verificados", "armazenamento criptografado", "prêmios de marcas parceiras", recursos de IA e planos pagos passaram a dizer a verdade ("em breve", "fica só no aparelho"), e as telas de exemplo estão marcadas como ilustrativas.
- **Acessibilidade**: link "Pular para o conteúdo", foco visível, abas e streak navegáveis por teclado, contraste das cores principais acima de 4,5:1.
- **Licenças**: dependências do site, do app e do servidor conferidas: todas permissivas (MIT, BSD, Apache, ISC, MPL, OFL; psycopg em LGPL usado sem modificação no servidor).

## Depende do responsável

1. **Revisão jurídica** dos documentos antes de divulgar o produto.
2. **Acordos de tratamento de dados (DPA)** com Supabase, Render e Vercel: aceitar ou assinar no painel de cada um (links em `/suboperadores`). Para a transferência internacional, conferir as cláusulas exigidas pela ANPD.
3. **Origem das imagens das medalhas** do app: confirmar quem criou e se o RONDO pode usá-las (se foram geradas por IA, guardar os termos da ferramenta usada). Hoje a página de licenças não afirma nada sobre elas.
4. **Confirmação do responsável por e-mail**: hoje o responsável só declara no formulário. Para verificar de verdade, é preciso um serviço de envio de e-mail.
5. **Antes de cobrar**: implementar o aviso por e-mail antes de cada renovação, o cancelamento pelo app e o reembolso de 7 dias, exatamente como `/reembolso` promete.
6. **Fotos com endereço público**: o bucket "midia" é público. A política avisa. Se quiser fotos privadas, trocar por links assinados.
7. **DMCA**: só registrar um agente nos EUA se o RONDO for atender o público americano.
8. **Mudou algum texto legal?** Suba `VERSAO_TERMOS`/`VERSAO_PRIVACIDADE` em `backend/app/legal.py` e `VERSAO_COOKIES` em `vitrine/src/lib/consentimento.ts`.
