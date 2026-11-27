"""XP extra da conta

Desde 2026-11-27 (pedido do dono): usuarios.xp_extra é somado ao XP das atividades no nível da conta. Só o banco define
(não vem na sincronia do app). Usado para dar o nível máximo à conta do dono.

Revision ID: d5a1c8e3f204
Revises: c3f9d2a7e815
Create Date: 2026-11-27 19:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd5a1c8e3f204'
down_revision: Union[str, Sequence[str], None] = 'c3f9d2a7e815'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('xp_extra', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'xp_extra')
