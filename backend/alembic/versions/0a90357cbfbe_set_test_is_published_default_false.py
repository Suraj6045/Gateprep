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

    # Revert legacy empty tests that were published
    op.execute(
        "UPDATE tests SET is_published = false WHERE NOT EXISTS "
        "(SELECT 1 FROM questions WHERE questions.test_id = tests.id)"
    )

    # Normalize order_index gaps for Postgres if present
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            """
            UPDATE questions q
            SET order_index = sub.new_idx
            FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY test_id ORDER BY order_index, id) - 1 as new_idx
                FROM questions
            ) sub
            WHERE q.id = sub.id
            """
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
