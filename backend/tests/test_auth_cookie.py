import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.auth import router
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, decode_token, hash_password
from app.models.models import User, UserRole


class AuthCookieTests(unittest.TestCase):
    def setUp(self):
        self.original_cookie_secure = settings.AUTH_COOKIE_SECURE
        self.original_cookie_samesite = settings.AUTH_COOKIE_SAMESITE
        settings.AUTH_COOKIE_SECURE = True
        settings.AUTH_COOKIE_SAMESITE = "none"
        self.addCleanup(self._restore_cookie_secure)

        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        db = self.SessionLocal()
        try:
            self.user = User(
                email="user@example.com",
                full_name="Cookie User",
                hashed_password=hash_password("secret123"),
                role=UserRole.aspirant,
                is_active=True,
            )
            db.add(self.user)
            db.commit()
            db.refresh(self.user)
            self.user_id = self.user.id
        finally:
            db.close()

        app = FastAPI()
        app.include_router(router)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app, base_url="https://testserver")

    def _restore_cookie_secure(self):
        settings.AUTH_COOKIE_SECURE = self.original_cookie_secure
        settings.AUTH_COOKIE_SAMESITE = self.original_cookie_samesite

    def test_login_sets_httponly_cookie_without_returning_access_token(self):
        response = self.client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "secret123"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("access_token", response.json())

        set_cookie = response.headers["set-cookie"]
        self.assertIn(f"{settings.AUTH_COOKIE_NAME}=", set_cookie)
        self.assertIn("HttpOnly", set_cookie)
        self.assertIn("Secure", set_cookie)
        self.assertIn("samesite=none", set_cookie.lower())

        me = self.client.get("/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["id"], self.user_id)

    def test_logout_clears_cookie_and_invalidates_current_session(self):
        self.client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "secret123"},
        )

        db = self.SessionLocal()
        try:
            original_session_id = (
                db.query(User)
                .filter(User.id == self.user_id)
                .one()
                .current_session_id
            )
        finally:
            db.close()

        response = self.client.post("/auth/logout")

        self.assertEqual(response.status_code, 200)
        self.assertIn(f"{settings.AUTH_COOKIE_NAME}=", response.headers["set-cookie"])
        self.assertIn("Max-Age=0", response.headers["set-cookie"])

        me = self.client.get("/auth/me")
        self.assertEqual(me.status_code, 401)

        db = self.SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).one()
            # Logout rotates the session id rather than nulling it out, so the
            # previously issued token is no longer valid even though a fresh
            # session id is stored.
            self.assertIsNotNone(user.current_session_id)
            self.assertNotEqual(user.current_session_id, original_session_id)
        finally:
            db.close()

    def test_refresh_keeps_current_session_valid_for_inflight_requests(self):
        login = self.client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "secret123"},
        )
        old_token = login.cookies.get(settings.AUTH_COOKIE_NAME)
        self.assertIsNotNone(old_token)
        old_session_id = decode_token(old_token)["sid"]

        refresh = self.client.post("/auth/refresh")

        self.assertEqual(refresh.status_code, 200)
        db = self.SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).one()
            self.assertEqual(user.current_session_id, old_session_id)
        finally:
            db.close()

        self.client.cookies.clear()
        old_cookie_response = self.client.get(
            "/auth/me",
            headers={"Cookie": f"{settings.AUTH_COOKIE_NAME}={old_token}"},
        )
        self.assertEqual(old_cookie_response.status_code, 200)

    def test_cookie_auth_rejects_legacy_token_without_cookie_marker(self):
        session_id = "legacy-session"
        db = self.SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).one()
            user.current_session_id = session_id
            db.commit()
        finally:
            db.close()

        legacy_token = create_access_token({
            "sub": self.user_id,
            "role": UserRole.aspirant,
            "sid": session_id,
        })
        response = self.client.get(
            "/auth/me",
            headers={"Cookie": f"{settings.AUTH_COOKIE_NAME}={legacy_token}"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid token")


if __name__ == "__main__":
    unittest.main()
