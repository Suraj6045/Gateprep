"""merge_heads

Revision ID: ed856d3f76a2
Revises: 710e0c970c16, 8f2d6c1a4b7e
Create Date: 2026-11-09 12:58:39.971559

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed856d3f76a2'
down_revision: Union[str, Sequence[str], None] = ('710e0c970c16', '8f2d6c1a4b7e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
