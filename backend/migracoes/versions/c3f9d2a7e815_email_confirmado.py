"""e-mail confirmado

Desde 2026-11-27: usuarios.email_confirmado diz se o e-mail da conta já foi provado como da pessoa (código de "Esqueci a
senha" ou login com Google/Apple). Uma conta criada com senha e e-mail não provado é tomada de volta pelo primeiro login
social do dono do e-mail (senha trocada por uma aleatória e 2FA desligada): fecha o golpe de criar a conta com o e-mail de
outra pessoa para espiar depois. Contas que já existem começam como não confirmadas.

Revision ID: c3f9d2a7e815
Revises: b7e2f4a91c30
Create Date: 2026-11-27 18:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3f9d2a7e815'
down_revision: Union[str, Sequence[str], None] = 'b7e2f4a91c30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('email_confirmado', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'email_confirmado')
