"""add activities

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-03-11 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e5f6g7h8i9j0'
down_revision: str | None = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'activities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('entity_name', sa.String(255), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('changes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_activities_entity', 'activities', ['entity_type', 'entity_id'])
    op.create_index('ix_activities_created_at', 'activities', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_activities_created_at', table_name='activities')
    op.drop_index('ix_activities_entity', table_name='activities')
    op.drop_table('activities')
