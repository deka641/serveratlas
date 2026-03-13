"""add activity indexes for action and entity_type

Revision ID: g8h9i0j1k2l3
Revises: f6g7h8i9j0k1
Create Date: 2026-03-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'g8h9i0j1k2l3'
down_revision: str | None = 'f6g7h8i9j0k1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_activities_action', 'activities', ['action'])
    op.create_index('ix_activities_entity_type', 'activities', ['entity_type'])


def downgrade() -> None:
    op.drop_index('ix_activities_entity_type', table_name='activities')
    op.drop_index('ix_activities_action', table_name='activities')
