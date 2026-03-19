import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, Float,
    ForeignKey, DateTime, Enum, Text, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
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
    in_progress = "in_progress"
    submitted = "submitted"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)  # nullable for Google OAuth
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    google_id = Column(String(255), nullable=True, unique=True)
    profile_photo = Column(String(500), nullable=True)
    # Single session — store current session ID, new login replaces it
    current_session_id = Column(String(64), nullable=True)
    current_ip = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    attempts = relationship("TestAttempt", back_populates="user")
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    checklist_items = relationship("ChecklistProgress", back_populates="user", cascade="all, delete-orphan")


class OTPToken(Base):
    """Temporary OTP storage — deleted after verification."""
    __tablename__ = "otp_tokens"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), index=True, nullable=False)
    otp = Column(String(6), nullable=False)
    purpose = Column(String(20), nullable=False)  # "register" or "login"
    # Store pending registration data for signup OTP
    pending_data = Column(JSON, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TestSeries(Base):
    """Group of tests."""
    __tablename__ = "test_series"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tests = relationship("Test", back_populates="series")
    creator = relationship("User", foreign_keys=[created_by])


class Test(Base):
    __tablename__ = "tests"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=180)
    total_marks = Column(Float, default=0.0)
    pdf_filename = Column(String(500), nullable=True)
    is_published = Column(Boolean, default=True)
    series_id = Column(Integer, ForeignKey("test_series.id"), nullable=True)
    series_order = Column(Integer, default=0)
    # Structured navigation fields
    category = Column(String(50), nullable=True)      # "weekly_quiz" | "test_series"
    series_name = Column(String(50), nullable=True)   # "made_easy" | "go_classes"
    test_type = Column(String(50), nullable=True)     # "subject_wise" | "topic_wise" | "full_length"
    subject = Column(String(100), nullable=True)      # subject name for weekly_quiz / topic_wise
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan", order_by="Question.order_index")
    attempts = relationship("TestAttempt", back_populates="test")
    creator = relationship("User", foreign_keys=[created_by])
    series = relationship("TestSeries", back_populates="tests")


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    question_type = Column(Enum(QuestionType), default=QuestionType.mcq, nullable=False)
    question_text = Column(Text, nullable=False)
    question_image_url = Column(String(500), nullable=True)   # Cloudinary URL
    question_image_id = Column(String(500), nullable=True)    # Cloudinary public_id
    options = Column(JSON, nullable=False, default=list)
    option_images = Column(JSON, nullable=True)  # {"A": "url", "B": "url", ...}
    correct_answer = Column(String(500), nullable=False)
    marks = Column(Float, default=1.0)
    negative_marks = Column(Float, default=0.33)
    order_index = Column(Integer, default=0)
    subject = Column(String(100), nullable=True)
    topic = Column(String(100), nullable=True)

    test = relationship("Test", back_populates="questions")
    bookmarks = relationship("Bookmark", back_populates="question", cascade="all, delete-orphan")


class TestAttempt(Base):
    __tablename__ = "test_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    status = Column(Enum(TestStatus), default=TestStatus.in_progress)
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Float, nullable=True)
    total_marks = Column(Float, nullable=True)
    tab_violations = Column(Integer, default=0)
    fullscreen_violations = Column(Integer, default=0)

    user = relationship("User", back_populates="attempts")
    test = relationship("Test", back_populates="attempts")
    answers = relationship("UserAnswer", back_populates="attempt", cascade="all, delete-orphan")


class UserAnswer(Base):
    __tablename__ = "user_answers"
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_answer = Column(String(500), nullable=True)
    is_correct = Column(Boolean, nullable=True)
    marks_awarded = Column(Float, default=0.0)
    time_spent_seconds = Column(Integer, default=0)  # time on this question
    answered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("Question")


class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_user_question_bookmark"),)

    user = relationship("User", back_populates="bookmarks")
    question = relationship("Question", back_populates="bookmarks")


# ── Syllabus Checklist ────────────────────────────────────────────

class ChecklistSubject(Base):
    __tablename__ = "checklist_subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    order_index = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    topics = relationship("ChecklistTopic", back_populates="subject", cascade="all, delete-orphan")


class ChecklistTopic(Base):
    __tablename__ = "checklist_topics"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("checklist_subjects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    order_index = Column(Integer, default=0)

    subject = relationship("ChecklistSubject", back_populates="topics")
    progress = relationship("ChecklistProgress", back_populates="topic", cascade="all, delete-orphan")


class ChecklistProgress(Base):
    """Tracks what each user has completed per topic."""
    __tablename__ = "checklist_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("checklist_topics.id"), nullable=False)
    # JSON storing completion: {"theory": true, "pyq_1": true, "pyq_2": false, "revision_1": true}
    completed_items = Column(JSON, default=dict)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("user_id", "topic_id", name="uq_user_topic_progress"),)

    user = relationship("User", back_populates="checklist_items")
    topic = relationship("ChecklistTopic", back_populates="progress")
