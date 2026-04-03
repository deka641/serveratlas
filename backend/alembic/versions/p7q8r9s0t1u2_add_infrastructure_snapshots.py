"""add infrastructure snapshots

Revision ID: p7q8r9s0t1u2
Revises: o6p7q8r9s0t1
Create Date: 2026-04-03 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'p7q8r9s0t1u2'
down_revision: Union[str, None] = 'o6p7q8r9s0t1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'infrastructure_snapshots',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('snapshot_date', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('total_servers', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('active_servers', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('healthy_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('unhealthy_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_monthly_cost', sa.Numeric(12, 2), nullable=True),
        sa.Column('backup_coverage_pct', sa.Numeric(5, 2), nullable=True),
        sa.Column('documentation_coverage_pct', sa.Numeric(5, 2), nullable=True),
        sa.Column('audit_compliance_pct', sa.Numeric(5, 2), nullable=True),
    )
    op.create_index('ix_snapshots_date', 'infrastructure_snapshots', ['snapshot_date'])


def downgrade() -> None:
    op.drop_index('ix_snapshots_date', table_name='infrastructure_snapshots')
    op.drop_table('infrastructure_snapshots')
