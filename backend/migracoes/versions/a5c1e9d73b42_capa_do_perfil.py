"""capa do perfil

Desde 2026-11-26 (pedido do dono): o perfil de cada pessoa tem uma capa no alto, no layout de tela de detalhe de jogo. A coluna
guarda o endereço público da imagem no Storage (a pasta da própria pessoa, como a foto de perfil). Nula = a capa cinza padrão,
com o botão para escolher uma.

Revision ID: a5c1e9d73b42
Revises: 862e6415306f
Create Date: 2026-11-26 16:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a5c1e9d73b42'
down_revision: Union[str, Sequence[str], None] = '862e6415306f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('capa', sa.String(length=300), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'capa')
