"""add search indexes

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-03-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: str | None = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_servers_name', 'servers', ['name'])
    op.create_index('ix_servers_status', 'servers', ['status'])
    op.create_index('ix_servers_hostname', 'servers', ['hostname'])
    op.create_index('ix_servers_ip_v4', 'servers', ['ip_v4'])
    op.create_index('ix_applications_name', 'applications', ['name'])
    op.create_index('ix_applications_status', 'applications', ['status'])
    op.create_index('ix_backups_last_run_status', 'backups', ['last_run_status'])
    op.create_index('ix_backups_last_run_at', 'backups', ['last_run_at'])


def downgrade() -> None:
    op.drop_index('ix_backups_last_run_at', table_name='backups')
    op.drop_index('ix_backups_last_run_status', table_name='backups')
    op.drop_index('ix_applications_status', table_name='applications')
    op.drop_index('ix_applications_name', table_name='applications')
    op.drop_index('ix_servers_ip_v4', table_name='servers')
    op.drop_index('ix_servers_hostname', table_name='servers')
    op.drop_index('ix_servers_status', table_name='servers')
    op.drop_index('ix_servers_name', table_name='servers')
