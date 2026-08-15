import pytest

from app.core.security import hash_password
from app.models import User
from app.models.enums import UserRole


@pytest.mark.asyncio
async def test_login_returns_token_for_valid_credentials(client, async_session):
    user = User(phone="+919999999999", password_hash=hash_password("Passw0rd!"), role=UserRole.RECEPTIONIST)
    async_session.add(user)
    await async_session.commit()

    response = await client.post("/api/v1/auth/login", json={"phone": "+919999999999", "password": "Passw0rd!"})

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["role"] == "RECEPTIONIST"


@pytest.mark.asyncio
async def test_login_rejects_wrong_password(client, async_session):
    user = User(phone="+919999999998", password_hash=hash_password("Passw0rd!"), role=UserRole.DOCTOR)
    async_session.add(user)
    await async_session.commit()

    response = await client.post("/api/v1/auth/login", json={"phone": "+919999999998", "password": "wrong"})

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_unknown_phone(client):
    response = await client.post("/api/v1/auth/login", json={"phone": "+910000000000", "password": "whatever"})
    assert response.status_code == 401
