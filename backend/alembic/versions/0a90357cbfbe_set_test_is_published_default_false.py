"""set_test_is_published_default_false

Revision ID: 0a90357cbfbe
Revises: ed856d3f76a2
Create Date: 2026-11-09 12:58:46.465196

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a90357cbfbe'
down_revision: Union[str, Sequence[str], None] = 'ed856d3f76a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("tests") as batch_op:
        batch_op.alter_column(
            "is_published",
            existing_type=sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("tests") as batch_op:
        batch_op.alter_column(
            "is_published",
            existing_type=sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        )
