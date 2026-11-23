"""XP dos mascotes

Desde 2026-11-23 (pedido do dono): cada mascote da coleção tem XP (mascotes.xp), de onde sai o nível dele. Só o mascote
escolhido ganha XP: a cada treino e a cada missão cumprida. usuarios.xp_treino_ate guarda até que treino o XP já foi contado
(o fim do último treino contado, ou a hora em que o mascote de agora foi escolhido), em milissegundos. Para quem já tem
conta, a contagem começa na hora desta migração: os treinos de antes não dão XP.

Revision ID: c4f7a1d9e236
Revises: b8e4f1a3c520
Create Date: 2026-11-23 20:30:00

"""
import time
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c4f7a1d9e236'
down_revision: Union[str, Sequence[str], None] = 'b8e4f1a3c520'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('mascotes', sa.Column('xp', sa.Integer(), server_default='0', nullable=False))
    op.add_column('usuarios', sa.Column('xp_treino_ate', sa.BigInteger(), nullable=True))
    op.execute(sa.text('UPDATE usuarios SET xp_treino_ate = :agora').bindparams(agora=int(time.time() * 1000)))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'xp_treino_ate')
    op.drop_column('mascotes', 'xp')
