"""Versões dos documentos legais e prazos de retenção. Mudou o texto da política ou dos termos? Suba a versão:
os aceites ficam registrados com a versão que a pessoa viu (tabela consentimentos)."""
from datetime import timedelta

VERSAO_TERMOS = "2026-11-12"
VERSAO_PRIVACIDADE = "2026-11-19"   # mensagens do suporte do site (o que fica guardado e por 1 ano)

MAIORIDADE = 18   # abaixo disso, o cadastro só vale com o consentimento de um responsável (LGPD, art. 14)

# retenção: o que o servidor apaga sozinho (a política de privacidade promete estes prazos)
RETENCAO_STORIES = timedelta(hours=24)
RETENCAO_NOTIFICACOES = timedelta(days=180)
RETENCAO_RESGATES = timedelta(days=7)   # o código de resgate de um pacote aberto na loja (servicos/loja.py)
RETENCAO_SUPORTE = timedelta(days=365)  # as mensagens escritas no suporte do site (rotas/suporte.py)
