import unittest
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import admin as admin_routes
from app.api.routes import auth as auth_routes
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import (
    generate_password_reset_token,
    hash_password,
    hash_password_reset_token,
)
from app.models.models import PasswordResetToken, User, UserRole


class PasswordResetTests(unittest.TestCase):
    def setUp(self):
        self.original_frontend_url = settings.FRONTEND_URL
        self.original_cookie_secure = settings.AUTH_COOKIE_SECURE
        settings.FRONTEND_URL = "https://frontend.test"
        settings.AUTH_COOKIE_SECURE = True
        self.addCleanup(self._restore_settings)

        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        db = self.SessionLocal()
        try:
            admin = User(
                email="admin@example.com",
                full_name="Admin User",
                hashed_password=hash_password("adminsecret"),
                role=UserRole.admin,
                is_active=True,
            )
            user = User(
                email="student@example.com",
                full_name="Student User",
                hashed_password=hash_password("oldsecret"),
                role=UserRole.aspirant,
                is_active=True,
            )
            db.add_all([admin, user])
            db.commit()
            db.refresh(admin)
            db.refresh(user)
            self.admin_id = admin.id
            self.user_id = user.id
        finally:
            db.close()

        app = FastAPI()
        app.include_router(auth_routes.router)
        app.include_router(admin_routes.router)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.admin_client = TestClient(app, base_url="https://testserver")
        self.user_client = TestClient(app, base_url="https://testserver")
        self.public_client = TestClient(app, base_url="https://testserver")

    def _restore_settings(self):
        settings.FRONTEND_URL = self.original_frontend_url
        settings.AUTH_COOKIE_SECURE = self.original_cookie_secure

    def _login_admin(self):
        response = self.admin_client.post(
            "/auth/login",
            json={"email": "admin@example.com", "password": "adminsecret"},
        )
        self.assertEqual(response.status_code, 200)

    def _create_reset_link(self):
        response = self.admin_client.post(f"/admin/users/{self.user_id}/password-reset")
        self.assertEqual(response.status_code, 200)
        return response.json()

    def _token_from_url(self, reset_url: str) -> str:
        token = parse_qs(urlparse(reset_url).query).get("token", [None])[0]
        self.assertTrue(token)
        return token

    def test_admin_generated_link_resets_password_once_and_invalidates_session(self):
        self._login_admin()
        user_login = self.user_client.post(
            "/auth/login",
            json={"email": "student@example.com", "password": "oldsecret"},
        )
        self.assertEqual(user_login.status_code, 200)
        self.assertEqual(self.user_client.get("/auth/me").status_code, 200)

        reset_payload = self._create_reset_link()
        self.assertEqual(reset_payload["email"], "student@example.com")
        self.assertTrue(reset_payload["reset_url"].startswith(f"{settings.FRONTEND_URL}/reset-password?"))
        self.assertNotIn("token_hash", reset_payload)

        token = self._token_from_url(reset_payload["reset_url"])
        reset_response = self.public_client.post(
            "/auth/reset-password",
            json={"token": token, "password": "newsecret"},
        )
        self.assertEqual(reset_response.status_code, 200)

        self.assertEqual(self.user_client.get("/auth/me").status_code, 401)
        old_login = self.user_client.post(
            "/auth/login",
            json={"email": "student@example.com", "password": "oldsecret"},
        )
        self.assertEqual(old_login.status_code, 401)
        new_login = self.user_client.post(
            "/auth/login",
            json={"email": "student@example.com", "password": "newsecret"},
        )
        self.assertEqual(new_login.status_code, 200)

        reuse_response = self.public_client.post(
            "/auth/reset-password",
            json={"token": token, "password": "anothersecret"},
        )
        self.assertEqual(reuse_response.status_code, 400)

    def test_new_admin_link_invalidates_previous_unused_link(self):
        self._login_admin()
        first = self._token_from_url(self._create_reset_link()["reset_url"])
        second = self._token_from_url(self._create_reset_link()["reset_url"])

        first_response = self.public_client.post(
            "/auth/reset-password",
            json={"token": first, "password": "firstsecret"},
        )
        self.assertEqual(first_response.status_code, 400)

        second_response = self.public_client.post(
            "/auth/reset-password",
            json={"token": second, "password": "secondsecret"},
        )
        self.assertEqual(second_response.status_code, 200)

    def test_expired_reset_token_is_rejected(self):
        token = generate_password_reset_token()
        db = self.SessionLocal()
        try:
            db.add(
                PasswordResetToken(
                    user_id=self.user_id,
                    created_by=self.admin_id,
                    token_hash=hash_password_reset_token(token),
                    expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
                )
            )
            db.commit()
        finally:
            db.close()

        response = self.public_client.post(
            "/auth/reset-password",
            json={"token": token, "password": "newsecret"},
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
