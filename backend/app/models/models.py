import enum
from datetime import datetime, timezone

from sqlalchemy import (JSON, Boolean, DateTime, Enum, Float,
                        ForeignKey, Integer, String, Text, UniqueConstraint, Index)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"
    aspirant = "aspirant"


class QuestionType(str, enum.Enum):
    mcq = "mcq"
    msq = "msq"
    nat = "nat"


class TestStatus(str, enum.Enum):
    __test__ = False
    in_progress = "in_progress"
    submitted = "submitted"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.user, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    profile_photo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    current_session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("ix_users_created_at_id", "created_at", "id"),
        Index("ix_users_role_created_at_id", "role", "created_at", "id"),
    )

    attempts = relationship("TestAttempt", back_populates="user")
    practice_counters = relationship(
        "PracticeAttemptCounter", back_populates="user", cascade="all, delete-orphan"
    )
    bookmarks = relationship(
        "Bookmark", back_populates="user", cascade="all, delete-orphan"
    )
    password_reset_tokens = relationship(
        "PasswordResetToken",
        foreign_keys="PasswordResetToken.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship(
        "User", foreign_keys=[user_id], back_populates="password_reset_tokens"
    )
    creator = relationship("User", foreign_keys=[created_by])


class TestSeries(Base):
    """Group of tests."""

    __test__ = False
    __tablename__ = "test_series"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tests = relationship("Test", back_populates="series")
    creator = relationship("User", foreign_keys=[created_by])


class Test(Base):
    __test__ = False
    __tablename__ = "tests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=180)
    total_marks: Mapped[float] = mapped_column(Float, default=0.0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    series_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("test_series.id"), nullable=True, index=True)
    series_order: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    series_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    test_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    questions = relationship(
        "Question",
        back_populates="test",
        cascade="all, delete-orphan",
        order_by="Question.order_index",
    )
    attempts = relationship(
        "TestAttempt", back_populates="test", cascade="all, delete-orphan"
    )
    practice_counters = relationship(
        "PracticeAttemptCounter", back_populates="test", cascade="all, delete-orphan"
    )
    creator = relationship("User", foreign_keys=[created_by])
    series = relationship("TestSeries", back_populates="tests")


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(Integer, ForeignKey("tests.id"), nullable=False, index=True)
    question_type: Mapped[QuestionType] = mapped_column(Enum(QuestionType), default=QuestionType.mcq, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    question_image_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    options: Mapped[list | dict] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    option_images: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    correct_answer: Mapped[str] = mapped_column(String(500), nullable=False)
    marks: Mapped[float] = mapped_column(Float, default=1.0)
    negative_marks: Mapped[float] = mapped_column(Float, default=0.33)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True)
    topic: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index("ix_questions_options_gin", "options", postgresql_using="gin"),
        Index("ix_questions_option_images_gin", "option_images", postgresql_using="gin"),
    )

    test = relationship("Test", back_populates="questions")
    bookmarks = relationship(
        "Bookmark", back_populates="question", cascade="all, delete-orphan"
    )


class TestAttempt(Base):
    __test__ = False
    __tablename__ = "test_attempts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    test_id: Mapped[int] = mapped_column(Integer, ForeignKey("tests.id"), nullable=False, index=True)
    status: Mapped[TestStatus] = mapped_column(Enum(TestStatus), default=TestStatus.in_progress)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_marks: Mapped[float | None] = mapped_column(Float, nullable=True)
    tab_violations: Mapped[int] = mapped_column(Integer, default=0)
    fullscreen_violations: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        Index("ix_test_attempts_test_id_status_user_id", "test_id", "status", "user_id"),
    )

    user = relationship("User", back_populates="attempts")
    test = relationship("Test", back_populates="attempts")
    answers = relationship(
        "UserAnswer", back_populates="attempt", cascade="all, delete-orphan"
    )


class PracticeAttemptCounter(Base):
    __tablename__ = "practice_attempt_counters"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    test_id: Mapped[int] = mapped_column(Integer, ForeignKey("tests.id"), nullable=False, index=True)
    count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("user_id", "test_id", name="uq_user_test_practice_counter"),
    )

    user = relationship("User", back_populates="practice_counters")
    test = relationship("Test", back_populates="practice_counters")


class UserAnswer(Base):
    __tablename__ = "user_answers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    attempt_id: Mapped[int] = mapped_column(Integer, ForeignKey("test_attempts.id"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    selected_answer: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    marks_awarded: Mapped[float] = mapped_column(Float, default=0.0)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("Question")


class Bookmark(Base):
    __tablename__ = "bookmarks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="uq_user_question_bookmark"),
    )

    user = relationship("User", back_populates="bookmarks")
    question = relationship("Question", back_populates="bookmarks")

