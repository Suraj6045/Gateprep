"""remove_pdf_filename

Revision ID: 710e0c970c16
Revises: c4b2f2f8e91d
Create Date: 2026-06-16 13:32:02.174814

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "710e0c970c16"
down_revision: Union[str, Sequence[str], None] = "c4b2f2f8e91d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(
        column["name"] == column_name for column in inspector.get_columns(table_name)
    )


def upgrade() -> None:
    """Drop the legacy PDF filename column from tests."""
    if _has_column("tests", "pdf_filename"):
        op.drop_column("tests", "pdf_filename")


def downgrade() -> None:
    """Restore the legacy PDF filename column."""
    if not _has_column("tests", "pdf_filename"):
        op.add_column(
            "tests",
            sa.Column("pdf_filename", sa.String(length=500), nullable=True),
        )
