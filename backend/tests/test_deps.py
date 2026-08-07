import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, patch
from app.models.models import User, UserRole
from app.api.deps import (
    _get_user_id_from_payload,
    _get_auth_token,
    _get_authenticated_user,
    get_current_user,
    get_optional_current_user,
    require_admin,
    require_aspirant,
)

def test_get_user_id_from_payload():
    # Valid payloads
    assert _get_user_id_from_payload({"sub": 123}) == 123
    assert _get_user_id_from_payload({"sub": "456"}) == 456

    # Missing sub
    with pytest.raises(HTTPException) as exc:
        _get_user_id_from_payload({})
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid token"

    # Invalid sub types/values
    with pytest.raises(HTTPException) as exc:
        _get_user_id_from_payload({"sub": "abc"})
    assert exc.value.status_code == 401
    
    with pytest.raises(HTTPException) as exc:
        _get_user_id_from_payload({"sub": [1, 2]})
    assert exc.value.status_code == 401

def test_get_auth_token():
    req = MagicMock()
    with patch("app.api.deps.settings") as mock_settings:
        mock_settings.AUTH_COOKIE_NAME = "test_cookie"
        req.cookies.get.return_value = "token123"
        assert _get_auth_token(req) == "token123"
        req.cookies.get.assert_called_once_with("test_cookie")

def test_get_authenticated_user():
    db = MagicMock()
    mock_query = db.query.return_value.filter.return_value
    
    # User not found
    mock_query.first.return_value = None
    with pytest.raises(HTTPException, match="User not found"):
        _get_authenticated_user(db, 1, "session_1")
        
    # Session expired / mismatched
    mock_user = User(id=1, current_session_id="session_1")
    mock_query.first.return_value = mock_user
    
    with pytest.raises(HTTPException, match="Session expired"):
        _get_authenticated_user(db, 1, "session_2")
        
    with pytest.raises(HTTPException, match="Session expired"):
        _get_authenticated_user(db, 1, None)
        
    # Success
    assert _get_authenticated_user(db, 1, "session_1") == mock_user

@patch("app.api.deps._get_authenticated_user")
@patch("app.api.deps.decode_token")
@patch("app.api.deps._get_auth_token")
def test_get_current_user(mock_get_auth_token, mock_decode, mock_get_authenticated_user):
    req = MagicMock()
    db = MagicMock()
    
    # Missing token
    mock_get_auth_token.return_value = None
    with pytest.raises(HTTPException, match="Not authenticated"):
        get_current_user(req, db)
        
    # Invalid token (decode fails)
    mock_get_auth_token.return_value = "bad_token"
    mock_decode.return_value = None
    with pytest.raises(HTTPException, match="Invalid or expired token"):
        get_current_user(req, db)
        
    # Invalid auth claim
    mock_decode.return_value = {"auth": "bearer", "sub": 1}
    with pytest.raises(HTTPException, match="Invalid token"):
        get_current_user(req, db)
        
    # Success
    mock_decode.return_value = {"auth": "cookie", "sub": 1, "sid": "session_1"}
    mock_get_authenticated_user.return_value = "mock_user"
    assert get_current_user(req, db) == "mock_user"
    mock_get_authenticated_user.assert_called_once_with(db, 1, "session_1")

@patch("app.api.deps.get_current_user")
def test_get_optional_current_user(mock_get_current_user):
    req = MagicMock()
    db = MagicMock()
    
    with patch("app.api.deps.settings") as mock_settings:
        mock_settings.AUTH_COOKIE_NAME = "test_cookie"
        
        # No cookie present
        req.cookies.get.return_value = None
        assert get_optional_current_user(req, db) is None
        
        # Cookie present, auth successful
        req.cookies.get.return_value = "token123"
        mock_get_current_user.return_value = "mock_user"
        assert get_optional_current_user(req, db) == "mock_user"
        
        # Cookie present, but auth fails
        mock_get_current_user.side_effect = HTTPException(status_code=401)
        assert get_optional_current_user(req, db) is None

def test_require_admin():
    admin_user = User(role=UserRole.admin)
    assert require_admin(admin_user) == admin_user
    
    user = User(role=UserRole.user)
    with pytest.raises(HTTPException, match="Admin access required"):
        require_admin(user)

def test_require_aspirant():
    admin_user = User(role=UserRole.admin)
    assert require_aspirant(admin_user) == admin_user
    
    aspirant_user = User(role=UserRole.aspirant)
    assert require_aspirant(aspirant_user) == aspirant_user
    
    user = User(role=UserRole.user)
    with pytest.raises(HTTPException, match="Access restricted to approved aspirants"):
        require_aspirant(user)
