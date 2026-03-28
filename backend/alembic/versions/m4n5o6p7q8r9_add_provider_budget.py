"""add provider budget fields

Revision ID: m4n5o6p7q8r9
Revises: l3m4n5o6p7q8
Create Date: 2026-03-28 00:03:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'm4n5o6p7q8r9'
down_revision: Union[str, None] = 'l3m4n5o6p7q8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('providers', sa.Column('monthly_budget', sa.Numeric(10, 2), nullable=True))
    op.add_column('providers', sa.Column('budget_currency', sa.String(3), server_default='EUR', nullable=True))


def downgrade() -> None:
    op.drop_column('providers', 'budget_currency')
    op.drop_column('providers', 'monthly_budget')
