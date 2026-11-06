import os

# precisa vir antes de qualquer import do app: nos testes todas as requisições saem do mesmo endereço
os.environ.setdefault("LIMITE_REQ_MINUTO", "0")
os.environ.setdefault("LIMITE_AUTH_MINUTO", "0")
