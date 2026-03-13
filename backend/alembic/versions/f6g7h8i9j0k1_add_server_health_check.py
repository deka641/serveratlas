"""add server health check fields

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2026-03-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f6g7h8i9j0k1'
down_revision: Union[str, None] = 'e5f6g7h8i9j0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('servers', sa.Column('last_checked_at', sa.DateTime(), nullable=True))
    op.add_column('servers', sa.Column('last_check_status', sa.String(20), nullable=True, server_default='unknown'))
    op.add_column('servers', sa.Column('response_time_ms', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('servers', 'response_time_ms')
    op.drop_column('servers', 'last_check_status')
    op.drop_column('servers', 'last_checked_at')
