from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, aliased, joinedload, selectinload

from app.models.models import (
    PracticeAttemptCounter,
    TestAttempt,
    TestStatus,
)

MAX_REATTEMPTS = 5  # max reattempts per test (6 total including first)


def _submitted_attempts_query(db: Session, user_id: int, test_id: int):
    return db.query(TestAttempt).filter(
        TestAttempt.user_id == user_id,
        TestAttempt.test_id == test_id,
        TestAttempt.status == TestStatus.submitted,
    )


def _first_submitted_attempt(
    db: Session, user_id: int, test_id: int
) -> Optional[TestAttempt]:
    return (
        _submitted_attempts_query(db, user_id, test_id)
        .order_by(TestAttempt.id.asc())
        .first()
    )


def _practice_counter(
    db: Session, user_id: int, test_id: int
) -> Optional[PracticeAttemptCounter]:
    return (
        db.query(PracticeAttemptCounter)
        .filter(
            PracticeAttemptCounter.user_id == user_id,
            PracticeAttemptCounter.test_id == test_id,
        )
        .first()
    )


def _attempt_progress(
    db: Session,
    user_id: int,
    test_id: int,
    submitted_count: Optional[int] = None,
) -> dict:
    if submitted_count is None:
        submitted_count = _submitted_attempts_query(db, user_id, test_id).count()

    counter = _practice_counter(db, user_id, test_id)
    stored_practice_count = counter.count if counter else 0
    legacy_practice_count = max(submitted_count - 1, 0)
    practice_count = max(stored_practice_count, legacy_practice_count)

    return {
        "submitted_count": submitted_count,
        "practice_count": practice_count,
        "total_used": (1 if submitted_count > 0 else 0) + practice_count,
    }


def _set_practice_count(
    db: Session, user_id: int, test_id: int, count: int
) -> PracticeAttemptCounter:
    counter = _practice_counter(db, user_id, test_id)
    if not counter:
        counter = PracticeAttemptCounter(user_id=user_id, test_id=test_id, count=0)
        db.add(counter)

    counter.count = max(counter.count or 0, count)
    counter.updated_at = datetime.now(timezone.utc)
    return counter


def _has_previous_submission(
    db: Session, user_id: int, test_id: int, attempt_id: int
) -> bool:
    return (
        db.query(TestAttempt.id)
        .filter(
            TestAttempt.user_id == user_id,
            TestAttempt.test_id == test_id,
            TestAttempt.status == TestStatus.submitted,
            TestAttempt.id != attempt_id,
        )
        .first()
        is not None
    )


def _attempt_out(a: TestAttempt) -> dict:
    return {
        "id": a.id,
        "test_id": a.test_id,
        "status": a.status,
        "started_at": a.started_at,
        "submitted_at": a.submitted_at,
        "score": a.score,
        "total_marks": a.total_marks,
        "tab_violations": a.tab_violations,
        "fullscreen_violations": a.fullscreen_violations,
    }


def _percentage(
    score: Optional[float], total_marks: Optional[float], digits: int = 2
) -> float:
    return round((score or 0) / total_marks * 100, digits) if total_marks else 0


def _get_first_attempts(test_id: int, db: Session) -> list[TestAttempt]:
    if db.get_bind().dialect.name == "postgresql":
        return _first_attempts_pg(test_id, db)
    return _first_attempts_generic(test_id, db)


def _first_attempts_pg(test_id: int, db: Session) -> list[TestAttempt]:
    """Fetch first attempts using PostgreSQL DISTINCT ON."""
    first_attempts_subquery = (
        db.query(TestAttempt)
        .filter(
            TestAttempt.test_id == test_id,
            TestAttempt.status == TestStatus.submitted,
        )
        .distinct(TestAttempt.user_id)
        .order_by(TestAttempt.user_id, TestAttempt.id.asc())
        .subquery()
    )

    FirstAttempt = aliased(TestAttempt, first_attempts_subquery)

    return (
        db.query(FirstAttempt)
        .options(
            joinedload(FirstAttempt.user),
            selectinload(FirstAttempt.answers),
        )
        .order_by(
            FirstAttempt.score.desc(),
            FirstAttempt.id.asc(),
        )
        .all()
    )


def _first_attempts_generic(test_id: int, db: Session) -> list[TestAttempt]:
    """Fetch first attempts using ROW_NUMBER() for non-PostgreSQL dialects."""
    first_attempt_ids_subquery = (
        db.query(
            TestAttempt.id.label("attempt_id"),
            func.row_number()
            .over(
                partition_by=TestAttempt.user_id,
                order_by=TestAttempt.id.asc(),
            )
            .label("attempt_rank"),
        )
        .filter(
            TestAttempt.test_id == test_id,
            TestAttempt.status == TestStatus.submitted,
        )
        .subquery()
    )

    return (
        db.query(TestAttempt)
        .options(
            joinedload(TestAttempt.user),
            selectinload(TestAttempt.answers),
        )
        .join(
            first_attempt_ids_subquery,
            TestAttempt.id == first_attempt_ids_subquery.c.attempt_id,
        )
        .filter(first_attempt_ids_subquery.c.attempt_rank == 1)
        .order_by(
            TestAttempt.score.desc(),
            TestAttempt.id.asc(),
        )
        .all()
    )
