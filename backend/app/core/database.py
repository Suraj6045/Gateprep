from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

from typing import Any

db_url = settings.sqlalchemy_database_url
engine_kwargs: dict[str, Any] = {"pool_pre_ping": True}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Keep a small warm QueuePool. Supavisor (port 6543, transaction mode)
    # multiplexes server connections per transaction, so client-side pooling
    # is safe and avoids a fresh TCP+TLS handshake on every request.
    # pool_recycle refreshes sockets before Supavisor drops idle clients.
    engine_kwargs.update(
        {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": 30,
            "pool_recycle": 1800,
        }
    )

engine = create_engine(db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
