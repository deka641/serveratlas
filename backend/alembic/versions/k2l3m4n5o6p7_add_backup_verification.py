"""add backup verification

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-03-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "k2l3m4n5o6p7"
down_revision = "j1k2l3m4n5o6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("backups", sa.Column("last_verified_at", sa.DateTime(), nullable=True))
    op.add_column("backups", sa.Column("last_verified_by", sa.String(255), nullable=True))
    op.add_column("backups", sa.Column("verification_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("backups", "verification_notes")
    op.drop_column("backups", "last_verified_by")
    op.drop_column("backups", "last_verified_at")
