import pytest

from app.core.security import create_access_token, hash_password
from app.models import Department, User
from app.models.enums import UserRole


def _admin_headers(role="SUPER_ADMIN"):
    token = create_access_token(subject="00000000-0000-0000-0000-000000000050", role=role)
    return {"Authorization": f"Bearer {token}"}


async def _seed_admin_user(async_session, role=UserRole.SUPER_ADMIN):
    user = User(
        user_id="00000000-0000-0000-0000-000000000050",
        phone="+919000000050",
        password_hash=hash_password("x"),
        role=role,
    )
    async_session.add(user)
    await async_session.commit()


@pytest.mark.asyncio
async def test_admin_creates_a_department(client, async_session):
    await _seed_admin_user(async_session)

    response = await client.post(
        "/api/v1/departments",
        headers=_admin_headers(),
        json={"name": "Orthopedics", "description": "Bone and joint care"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Orthopedics"


@pytest.mark.asyncio
async def test_non_admin_cannot_create_a_department(client, async_session):
    user = User(
        user_id="00000000-0000-0000-0000-000000000051",
        phone="+919000000051",
        password_hash=hash_password("x"),
        role=UserRole.RECEPTIONIST,
    )
    async_session.add(user)
    await async_session.commit()
    token = create_access_token(subject=str(user.user_id), role="RECEPTIONIST")

    response = await client.post(
        "/api/v1/departments",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Orthopedics"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_departments(client, async_session):
    async_session.add(Department(name="Cardiology"))
    await async_session.commit()

    response = await client.get("/api/v1/departments")

    assert response.status_code == 200
    names = [dept["name"] for dept in response.json()]
    assert "Cardiology" in names


@pytest.mark.asyncio
async def test_admin_creates_a_doctor_with_login_account(client, async_session):
    await _seed_admin_user(async_session)
    dept = Department(name="Neurology")
    async_session.add(dept)
    await async_session.commit()
    await async_session.refresh(dept)

    response = await client.post(
        "/api/v1/doctors",
        headers=_admin_headers(),
        json={
            "full_name": "Dr. New Hire",
            "phone": "+919876500060",
            "password": "Doctor@123",
            "qualification": "MBBS, MD",
            "specialization": "Neurologist",
            "department_id": str(dept.department_id),
            "consultation_fee": "800.00",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "Dr. New Hire"
    assert body["department_name"] == "Neurology"

    login_resp = await client.post(
        "/api/v1/auth/login", json={"phone": "+919876500060", "password": "Doctor@123"}
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["role"] == "DOCTOR"


@pytest.mark.asyncio
async def test_admin_creating_doctor_rejects_duplicate_phone(client, async_session):
    await _seed_admin_user(async_session)
    dept = Department(name="ENT")
    async_session.add(dept)
    await async_session.commit()
    await async_session.refresh(dept)

    payload = {
        "full_name": "Dr. Dup",
        "phone": "+919876500061",
        "password": "Doctor@123",
        "qualification": "MBBS",
        "specialization": "ENT Surgeon",
        "department_id": str(dept.department_id),
    }
    first = await client.post("/api/v1/doctors", headers=_admin_headers(), json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/doctors", headers=_admin_headers(), json=payload)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_non_admin_cannot_create_a_doctor(client, async_session):
    dept = Department(name="Dermatology")
    async_session.add(dept)
    user = User(
        user_id="00000000-0000-0000-0000-000000000052",
        phone="+919000000052",
        password_hash=hash_password("x"),
        role=UserRole.DOCTOR,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(dept)
    token = create_access_token(subject=str(user.user_id), role="DOCTOR")

    response = await client.post(
        "/api/v1/doctors",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Dr. Sneaky",
            "phone": "+919876500062",
            "password": "Doctor@123",
            "qualification": "MBBS",
            "specialization": "Dermatologist",
            "department_id": str(dept.department_id),
        },
    )

    assert response.status_code == 403
