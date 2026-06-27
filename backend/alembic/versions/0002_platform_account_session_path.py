"""add platform account session path

Revision ID: 0002_platform_account_session_path
Revises: 0001_initial
Create Date: 2026-06-27 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_platform_account_session_path"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("platform_accounts", sa.Column("session_path", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("platform_accounts", "session_path")
