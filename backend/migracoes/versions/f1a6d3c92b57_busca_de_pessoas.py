"""coluna de busca de pessoas (nome e @ sem acento)

Revision ID: f1a6d3c92b57
Revises: e7c2a9b15d40
Create Date: 2026-11-07 11:00:00

"""
import unicodedata
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f1a6d3c92b57'
down_revision: Union[str, Sequence[str], None] = 'e7c2a9b15d40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _norm(texto: str) -> str:
    sem = "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))
    return " ".join(sem.lower().split())[:200]


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('busca', sa.String(length=200), server_default='', nullable=False))
    # quem já tem conta entra na busca: preenche a coluna com o nome e o @ de cada um
    conexao = op.get_bind()
    usuarios = sa.table('usuarios', sa.column('id', sa.Integer), sa.column('nome', sa.String), sa.column('arroba', sa.String), sa.column('busca', sa.String))
    for linha in conexao.execute(sa.select(usuarios.c.id, usuarios.c.nome, usuarios.c.arroba)).fetchall():
        conexao.execute(usuarios.update().where(usuarios.c.id == linha.id).values(busca=_norm(f"{linha.nome} {linha.arroba or ''}")))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'busca')
