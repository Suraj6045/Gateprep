"""add unique user answer per attempt and question

Revision ID: 8f2d6c1a4b7e
Revises: c4b2f2f8e91d
Create Date: 2026-10-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f2d6c1a4b7e"
down_revision: Union[str, Sequence[str], None] = "c4b2f2f8e91d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONSTRAINT_NAME = "uq_user_answer_attempt_question"


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM user_answers
            WHERE id IN (
                SELECT id
                FROM (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY attempt_id, question_id
                            ORDER BY id DESC
                        ) AS duplicate_rank
                    FROM user_answers
                ) duplicates
                WHERE duplicate_rank > 1
            )
            """
        )
    )
    op.create_unique_constraint(
        CONSTRAINT_NAME,
        "user_answers",
        ["attempt_id", "question_id"],
    )


def downgrade() -> None:
    op.drop_constraint(CONSTRAINT_NAME, "user_answers", type_="unique")
