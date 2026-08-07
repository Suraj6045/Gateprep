"""add_database_review_indexes_and_privileges

Revision ID: c4b2f2f8e91d
Revises: 053d07ea67a5
Create Date: 2026-06-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4b2f2f8e91d"
down_revision: Union[str, Sequence[str], None] = "053d07ea67a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BTREE_INDEXES = (
    ("ix_users_created_at_id", "users", ["created_at", "id"]),
    ("ix_users_role_created_at_id", "users", ["role", "created_at", "id"]),
    ("ix_password_reset_tokens_created_by", "password_reset_tokens", ["created_by"]),
    ("ix_practice_attempt_counters_user_id", "practice_attempt_counters", ["user_id"]),
    ("ix_practice_attempt_counters_test_id", "practice_attempt_counters", ["test_id"]),
    ("ix_bookmarks_user_id", "bookmarks", ["user_id"]),
    ("ix_bookmarks_question_id", "bookmarks", ["question_id"]),
    ("ix_checklist_progress_user_id", "checklist_progress", ["user_id"]),
    ("ix_checklist_progress_topic_id", "checklist_progress", ["topic_id"]),
)

JSONB_GIN_INDEXES = (
    ("ix_questions_options_gin", "questions", "options"),
    ("ix_questions_option_images_gin", "questions", "option_images"),
    ("ix_checklist_progress_completed_items_gin", "checklist_progress", "completed_items"),
)


def _index_names(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return set()
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _create_index_if_missing(index_name: str, table_name: str, columns: list[str]) -> None:
    if index_name not in _index_names(table_name):
        op.create_index(index_name, table_name, columns, unique=False)


def _drop_index_if_present(index_name: str, table_name: str) -> None:
    if index_name in _index_names(table_name):
        op.drop_index(index_name, table_name=table_name)


def _create_gin_index_if_missing(index_name: str, table_name: str, column: str) -> None:
    if index_name not in _index_names(table_name):
        op.create_index(
            index_name,
            table_name,
            [column],
            unique=False,
            postgresql_using="gin",
        )


def upgrade() -> None:
    for index_name, table_name, columns in BTREE_INDEXES:
        _create_index_if_missing(index_name, table_name, columns)

    if op.get_bind().dialect.name != "postgresql":
        return

    for index_name, table_name, column in JSONB_GIN_INDEXES:
        _create_gin_index_if_missing(index_name, table_name, column)

    # Runtime roles should rely on explicit grants, not inherited PUBLIC access.
    op.execute("REVOKE ALL ON SCHEMA public FROM PUBLIC;")


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("GRANT USAGE ON SCHEMA public TO PUBLIC;")
        for index_name, table_name, _column in reversed(JSONB_GIN_INDEXES):
            _drop_index_if_present(index_name, table_name)

    for index_name, table_name, _columns in reversed(BTREE_INDEXES):
        _drop_index_if_present(index_name, table_name)
