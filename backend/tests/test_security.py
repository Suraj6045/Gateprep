from datetime import timedelta
from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token, decode_token

def test_decode_token_valid():
    token = create_access_token({"sub": "testuser"})
    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == "testuser"

def test_decode_token_expired():
    # Create a token that expired 1 minute ago
    token = create_access_token(
        data={"sub": "testuser"},
        expires_delta=timedelta(minutes=-1)
    )
    # decode_token should catch JWTError (specifically ExpiredSignatureError) and return None
    payload = decode_token(token)
    assert payload is None

def test_decode_token_invalid_signature():
    # Create a valid token but sign it with a different secret
    wrong_secret = "this_is_not_the_real_secret"
    to_encode = {"sub": "testuser"}
    encoded_jwt = jwt.encode(to_encode, wrong_secret, algorithm=settings.ALGORITHM)
    
    # decode_token should fail verification and return None
    payload = decode_token(encoded_jwt)
    assert payload is None

def test_decode_token_malformed_string():
    # decode_token should handle arbitrary malformed strings gracefully
    assert decode_token("not.a.real.jwt.token") is None
    assert decode_token("") is None
