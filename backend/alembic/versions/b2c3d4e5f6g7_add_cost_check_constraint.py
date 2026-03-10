"""add cost check constraint

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        'ck_servers_monthly_cost_non_negative',
        'servers',
        'monthly_cost >= 0 OR monthly_cost IS NULL',
    )


def downgrade() -> None:
    op.drop_constraint('ck_servers_monthly_cost_non_negative', 'servers', type_='check')
