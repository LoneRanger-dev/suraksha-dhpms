from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_hash_roundtrip():
    hashed = hash_password("Sup3rSecret!")
    assert hashed != "Sup3rSecret!"
    assert verify_password("Sup3rSecret!", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_roundtrip():
    token = create_access_token(subject="user-123", role="DOCTOR")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert payload["role"] == "DOCTOR"
