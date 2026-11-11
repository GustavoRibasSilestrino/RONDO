"""Versões dos documentos legais e prazos de retenção. Mudou o texto da política ou dos termos? Suba a versão:
os aceites ficam registrados com a versão que a pessoa viu (tabela consentimentos)."""
from datetime import timedelta

VERSAO_TERMOS = "2026-11-11"
VERSAO_PRIVACIDADE = "2026-11-11"

MAIORIDADE = 18   # abaixo disso, o cadastro só vale com o consentimento de um responsável (LGPD, art. 14)

# retenção: o que o servidor apaga sozinho (a política de privacidade promete estes prazos)
RETENCAO_STORIES = timedelta(hours=24)
RETENCAO_NOTIFICACOES = timedelta(days=180)
