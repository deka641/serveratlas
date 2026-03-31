"""add health check and audit indexes

Revision ID: o6p7q8r9s0t1
Revises: n5o6p7q8r9s0
Create Date: 2026-03-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'o6p7q8r9s0t1'
down_revision: Union[str, None] = 'n5o6p7q8r9s0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_health_checks_server_time', 'health_checks', ['server_id', 'checked_at'])
    op.create_index('ix_servers_last_check_status', 'servers', ['last_check_status'])
    op.create_index('ix_servers_last_audited_at', 'servers', ['last_audited_at'])


def downgrade() -> None:
    op.drop_index('ix_servers_last_audited_at', table_name='servers')
    op.drop_index('ix_servers_last_check_status', table_name='servers')
    op.drop_index('ix_health_checks_server_time', table_name='health_checks')
