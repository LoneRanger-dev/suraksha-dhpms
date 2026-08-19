"""add notifications table

Revision ID: 759e8ae1516b
Revises: 205ada30ca5f
Create Date: 2026-08-19 09:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import app.core.types

# revision identifiers, used by Alembic.
revision: str = '759e8ae1516b'
down_revision: Union[str, None] = '205ada30ca5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('notification_id', app.core.types.GUID(), nullable=False),
        sa.Column('user_id', app.core.types.GUID(), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('notification_id'),
    )
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_table('notifications')
