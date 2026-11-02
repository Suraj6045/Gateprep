import argparse
import logging
import os

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.models import User, UserRole

logger = logging.getLogger(__name__)


def _upsert_user(db, *, email: str, full_name: str, password: str, role: UserRole) -> None:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(email=email, full_name=full_name)
        db.add(user)

    user.full_name = full_name
    user.hashed_password = hash_password(password)
    user.role = role
    user.is_active = True
    user.current_session_id = None
    user.current_ip = None


def _delete_user(db, email: str) -> None:
    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cleanup", action="store_true", help="Remove E2E users instead of creating them")
    args = parser.parse_args()
    Base.metadata.create_all(bind=engine)

    admin_email = os.getenv("E2E_ADMIN_EMAIL", "e2e-admin@example.com")
    admin_password = os.getenv("E2E_ADMIN_PASSWORD", "testpassword")
    test_email = os.getenv("TEST_USER_EMAIL", "test@example.com")
    test_password = os.getenv("TEST_USER_PASSWORD", "testpassword")
    auth_test_email = os.getenv("AUTH_TEST_USER_EMAIL", "auth-flow@example.com")
    auth_test_password = os.getenv("AUTH_TEST_USER_PASSWORD", test_password)

    if len({admin_email, test_email, auth_test_email}) != 3:
        raise SystemExit("E2E admin, test user, and auth test user emails must be different.")

    with SessionLocal() as db:
        if args.cleanup:
            _delete_user(db, admin_email)
            _delete_user(db, test_email)
            _delete_user(db, auth_test_email)
            db.commit()
            logger.info("Cleaned up E2E users: %s, %s, %s", admin_email, test_email, auth_test_email)
        else:
            _upsert_user(
                db,
                email=admin_email,
                full_name="E2E Admin",
                password=admin_password,
                role=UserRole.admin,
            )
            _upsert_user(
                db,
                email=test_email,
                full_name="Test User",
                password=test_password,
                role=UserRole.aspirant,
            )
            _upsert_user(
                db,
                email=auth_test_email,
                full_name="Auth Flow User",
                password=auth_test_password,
                role=UserRole.aspirant,
            )
            db.commit()
            logger.info("Seeded E2E users: %s, %s, %s", admin_email, test_email, auth_test_email)


if __name__ == "__main__":
    main()
