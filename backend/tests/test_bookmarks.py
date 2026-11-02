from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.bookmarks import _fetch_user_bookmarks, _format_bookmark
from app.core.database import Base
from app.models.models import Bookmark, Question, Test


def test_fetch_user_bookmarks_eager_loads_question_and_test():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    test = Test(title="GATE Practice Test")
    question = Question(
        test=test,
        question_text="What is 2 + 2?",
        correct_answer="4",
        options=["2", "3", "4", "5"],
    )
    session.add(
        Bookmark(user_id=1, question=question, note="Review this")
    )
    session.commit()

    statement_count = 0

    def count_statements(*_):
        nonlocal statement_count
        statement_count += 1

    event.listen(engine, "before_cursor_execute", count_statements)
    try:
        bookmarks = _fetch_user_bookmarks(session, 1)
        formatted = [_format_bookmark(bookmark) for bookmark in bookmarks]
    finally:
        event.remove(engine, "before_cursor_execute", count_statements)
        session.close()

    assert statement_count == 1
    assert formatted[0].test_title == "GATE Practice Test"
