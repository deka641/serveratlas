"""add FK indexes

Revision ID: a1b2c3d4e5f6
Revises: 273d5000f306
Create Date: 2026-03-09 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '273d5000f306'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_servers_provider_id', 'servers', ['provider_id'])
    op.create_index('ix_applications_server_id', 'applications', ['server_id'])
    op.create_index('ix_server_ssh_keys_server_id', 'server_ssh_keys', ['server_id'])
    op.create_index('ix_server_ssh_keys_ssh_key_id', 'server_ssh_keys', ['ssh_key_id'])
    op.create_index('ix_ssh_connections_source_server_id', 'ssh_connections', ['source_server_id'])
    op.create_index('ix_ssh_connections_target_server_id', 'ssh_connections', ['target_server_id'])
    op.create_index('ix_ssh_connections_ssh_key_id', 'ssh_connections', ['ssh_key_id'])
    op.create_index('ix_backups_application_id', 'backups', ['application_id'])
    op.create_index('ix_backups_source_server_id', 'backups', ['source_server_id'])
    op.create_index('ix_backups_target_server_id', 'backups', ['target_server_id'])


def downgrade() -> None:
    op.drop_index('ix_backups_target_server_id', 'backups')
    op.drop_index('ix_backups_source_server_id', 'backups')
    op.drop_index('ix_backups_application_id', 'backups')
    op.drop_index('ix_ssh_connections_ssh_key_id', 'ssh_connections')
    op.drop_index('ix_ssh_connections_target_server_id', 'ssh_connections')
    op.drop_index('ix_ssh_connections_source_server_id', 'ssh_connections')
    op.drop_index('ix_server_ssh_keys_ssh_key_id', 'server_ssh_keys')
    op.drop_index('ix_server_ssh_keys_server_id', 'server_ssh_keys')
    op.drop_index('ix_applications_server_id', 'applications')
    op.drop_index('ix_servers_provider_id', 'servers')
