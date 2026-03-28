"""add server audit fields

Revision ID: l3m4n5o6p7q8
Revises: k2l3m4n5o6p7
Create Date: 2026-03-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l3m4n5o6p7q8'
down_revision: Union[str, None] = 'k2l3m4n5o6p7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('servers', sa.Column('last_audited_at', sa.DateTime(), nullable=True))
    op.add_column('servers', sa.Column('last_audited_by', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('servers', 'last_audited_by')
    op.drop_column('servers', 'last_audited_at')
