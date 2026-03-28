"""add performance indexes for dashboard and activity queries

Revision ID: i0j1k2l3m4n5
Revises: h9i0j1k2l3m4
Create Date: 2026-03-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'i0j1k2l3m4n5'
down_revision: Union[str, None] = 'h9i0j1k2l3m4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ix_activities_created_at and ix_activities_entity already exist from model definitions
    op.create_index('ix_backups_run_status', 'backups', ['last_run_at', 'last_run_status'])


def downgrade() -> None:
    op.drop_index('ix_backups_run_status', table_name='backups')
