"""Create alerts table with JSON columns.

Revision ID: 0001_create_alerts
Revises: 
Create Date: 2025-09-04
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_create_alerts"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alert_id", sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("anchored", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("evidence_path", sa.String(length=512), nullable=True),
        sa.Column("rule_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("signals", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_table("alerts")

