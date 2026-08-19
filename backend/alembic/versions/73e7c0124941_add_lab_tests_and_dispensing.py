"""add lab_tests_ordered to visits, dispensed tracking to prescriptions

Revision ID: 73e7c0124941
Revises: ca04702facfd
Create Date: 2026-08-19 23:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '73e7c0124941'
down_revision: Union[str, None] = 'ca04702facfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'visits',
        sa.Column(
            'lab_tests_ordered',
            sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'),
            nullable=True,
        ),
    )
    op.add_column('prescriptions', sa.Column('dispensed', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('prescriptions', sa.Column('dispensed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('prescriptions', 'dispensed_at')
    op.drop_column('prescriptions', 'dispensed')
    op.drop_column('visits', 'lab_tests_ordered')
