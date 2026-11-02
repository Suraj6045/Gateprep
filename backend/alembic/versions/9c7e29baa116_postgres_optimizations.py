"""postgres_optimizations

Revision ID: 9c7e29baa116
Revises: 54e3661375a4
Create Date: 2026-06-13 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c7e29baa116'
down_revision: Union[str, Sequence[str], None] = '54e3661375a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Only apply these optimizations if the dialect is postgresql
    if op.get_bind().dialect.name == "postgresql":
        # Drop redundant indexes on primary keys
        op.execute("DROP INDEX IF EXISTS ix_users_id;")
        op.execute("DROP INDEX IF EXISTS ix_tests_id;")
        op.execute("DROP INDEX IF EXISTS ix_questions_id;")
        op.execute("DROP INDEX IF EXISTS ix_test_attempts_id;")
        op.execute("DROP INDEX IF EXISTS ix_test_series_id;")
        op.execute("DROP INDEX IF EXISTS ix_user_answers_id;")
        op.execute("DROP INDEX IF EXISTS ix_bookmarks_id;")
        op.execute("DROP INDEX IF EXISTS ix_checklist_subjects_id;")
        op.execute("DROP INDEX IF EXISTS ix_checklist_topics_id;")
        op.execute("DROP INDEX IF EXISTS ix_checklist_progress_id;")
        op.execute("DROP INDEX IF EXISTS ix_practice_attempt_counters_id;")
        op.execute("DROP INDEX IF EXISTS ix_password_reset_tokens_id;")
        
        # Cast existing JSON columns to JSONB safely
        op.execute("ALTER TABLE questions ALTER COLUMN options TYPE jsonb USING options::text::jsonb;")
        op.execute("ALTER TABLE questions ALTER COLUMN option_images TYPE jsonb USING option_images::text::jsonb;")
        op.execute("ALTER TABLE checklist_progress ALTER COLUMN completed_items TYPE jsonb USING completed_items::text::jsonb;")


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        # Revert JSONB casts back to JSON.
        op.execute("ALTER TABLE questions ALTER COLUMN options TYPE json USING options::text::json;")
        op.execute("ALTER TABLE questions ALTER COLUMN option_images TYPE json USING option_images::text::json;")
        op.execute("ALTER TABLE checklist_progress ALTER COLUMN completed_items TYPE json USING completed_items::text::json;")

        # Recreate the redundant primary-key indexes that upgrade removed.
        op.execute("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_tests_id ON tests (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_questions_id ON questions (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_test_attempts_id ON test_attempts (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_test_series_id ON test_series (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_user_answers_id ON user_answers (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_bookmarks_id ON bookmarks (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_checklist_subjects_id ON checklist_subjects (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_checklist_topics_id ON checklist_topics (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_checklist_progress_id ON checklist_progress (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_practice_attempt_counters_id ON practice_attempt_counters (id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_id ON password_reset_tokens (id);")
