"""Dá mascotes de cada raridade a uma conta (pedido do dono, 2026-11-25: "coloque alguns de cada raridade na minha conta").
Só SOMA na coleção (nunca tira nada); prefere os mascotes que a conta ainda não tem. Usa o banco do .env (DATABASE_URL).

    python scripts/dar_mascotes.py <e-mail da conta> [quantos por raridade, padrão 3]

Rode de dentro de backend/ (com o .venv ativo)."""
import random
import sys
from datetime import datetime, timezone

sys.path.insert(0, '.')

from sqlalchemy import func, select   # noqa: E402

from app.banco import Sessao   # noqa: E402
from app.modelos import Mascote, Usuario   # noqa: E402
from app.servicos import loja   # noqa: E402


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    email, quantos = sys.argv[1].strip().lower(), int(sys.argv[2]) if len(sys.argv) > 2 else 3
    with Sessao() as sessao:
        usuario = sessao.scalar(select(Usuario).where(func.lower(Usuario.email) == email))
        if usuario is None:
            sys.exit('Conta não encontrada.')
        tem = {(m.linha, m.coluna) for m in sessao.scalars(select(Mascote).where(Mascote.usuario_id == usuario.id))}
        agora = datetime.now(timezone.utc)
        dados = []
        for linha, (raridade, _) in enumerate(loja.RARIDADES):
            novos = [c for c in loja.COLUNAS[linha] if (linha, c) not in tem]
            escolha = random.sample(novos, min(quantos, len(novos)))
            escolha += random.sample(loja.COLUNAS[linha], quantos - len(escolha))   # já tinha todos: repete
            for coluna in escolha:
                loja._somar(sessao, usuario.id, linha, coluna, agora)
                dados.append(f'{raridade} {linha}-{coluna}')
        sessao.commit()
        total = len(loja.colecao(sessao, usuario.id))
    print(f'Dados {len(dados)} mascotes: ' + ', '.join(dados))
    print(f'A conta tem agora {total} mascotes diferentes.')


main()
