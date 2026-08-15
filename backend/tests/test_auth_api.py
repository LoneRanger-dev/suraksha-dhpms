import pytest

from app.core.security import create_access_token, hash_password
from app.models import Department, Doctor, User
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


@pytest.mark.asyncio
async def test_me_returns_doctor_profile_for_doctor_role(client, async_session):
    dept = Department(name="Cardiology")
    async_session.add(dept)
    await async_session.flush()

    doc_user = User(phone="+919999999997", password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=dept.department_id,
        full_name="Dr. Me",
        qualification="MBBS",
        specialization="Cardiology",
    )
    async_session.add(doctor)
    await async_session.commit()
    await async_session.refresh(doc_user)
    await async_session.refresh(doctor)

    token = create_access_token(subject=str(doc_user.user_id), role="DOCTOR")
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "DOCTOR"
    assert body["doctor_id"] == str(doctor.doctor_id)
    assert body["doctor_full_name"] == "Dr. Me"


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
