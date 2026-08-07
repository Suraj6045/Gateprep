"""add_admin_pagination_indexes

Revision ID: 053d07ea67a5
Revises: 9c7e29baa116
Create Date: 2026-06-13 19:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '053d07ea67a5'
down_revision: Union[str, Sequence[str], None] = '9c7e29baa116'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


USER_INDEXES = (
    ('ix_users_created_at', ['created_at']),
    ('ix_users_role', ['role']),
)


def _user_index_names() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if 'users' not in inspector.get_table_names():
        return set()
    return {index['name'] for index in inspector.get_indexes('users')}


def upgrade() -> None:
    existing_indexes = _user_index_names()
    for index_name, columns in USER_INDEXES:
        if index_name not in existing_indexes:
            op.create_index(index_name, 'users', columns, unique=False)


def downgrade() -> None:
    existing_indexes = _user_index_names()
    for index_name, _columns in reversed(USER_INDEXES):
        if index_name in existing_indexes:
            op.drop_index(index_name, table_name='users')
