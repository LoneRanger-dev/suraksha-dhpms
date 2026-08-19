"""add follow_up_date to visits

Revision ID: ca04702facfd
Revises: 759e8ae1516b
Create Date: 2026-08-19 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ca04702facfd'
down_revision: Union[str, None] = '759e8ae1516b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('visits', sa.Column('follow_up_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('visits', 'follow_up_date')
