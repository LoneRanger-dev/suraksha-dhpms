import pytest

from app.core.security import create_access_token, hash_password
from app.models import MembershipPlan, User
from app.models.enums import MembershipTier, UserRole


def _admin_headers(role="SUPER_ADMIN"):
    token = create_access_token(subject="00000000-0000-0000-0000-000000000095", role=role)
    return {"Authorization": f"Bearer {token}"}


async def _seed_admin_user(async_session, role=UserRole.SUPER_ADMIN):
    user = User(
        user_id="00000000-0000-0000-0000-000000000095",
        phone="+919000000095",
        password_hash=hash_password("x"),
        role=role,
    )
    async_session.add(user)
    await async_session.commit()


async def _register_patient(client, async_session, phone, full_name):
    plan = MembershipPlan(name="Free", tier=MembershipTier.FREE, validity_days=365)
    async_session.add(plan)
    await async_session.commit()
    await async_session.refresh(plan)

    return await client.post(
        "/api/v1/patients",
        json={
            "full_name": full_name,
            "dob": "1990-01-01",
            "gender": "MALE",
            "phone": phone,
            "password": "Patient@123",
            "emergency_contact_phone": "+919876500097",
            "plan_id": str(plan.plan_id),
        },
    )


@pytest.mark.asyncio
async def test_admin_lists_all_patients(client, async_session):
    await _seed_admin_user(async_session)
    await _register_patient(client, async_session, "+919876500085", "Roster Patient One")
    await _register_patient(client, async_session, "+919876500086", "Roster Patient Two")

    response = await client.get("/api/v1/patients", headers=_admin_headers())

    assert response.status_code == 200
    names = [p["full_name"] for p in response.json()]
    assert "Roster Patient One" in names
    assert "Roster Patient Two" in names


@pytest.mark.asyncio
async def test_admin_can_search_patients_by_name(client, async_session):
    await _seed_admin_user(async_session)
    await _register_patient(client, async_session, "+919876500087", "Unique Search Name")
    await _register_patient(client, async_session, "+919876500088", "Someone Else")

    response = await client.get("/api/v1/patients?search=Unique", headers=_admin_headers())

    assert response.status_code == 200
    names = [p["full_name"] for p in response.json()]
    assert names == ["Unique Search Name"]


@pytest.mark.asyncio
async def test_non_admin_cannot_list_all_patients(client, async_session):
    user = User(
        user_id="00000000-0000-0000-0000-000000000096",
        phone="+919000000096",
        password_hash=hash_password("x"),
        role=UserRole.DOCTOR,
    )
    async_session.add(user)
    await async_session.commit()
    token = create_access_token(subject=str(user.user_id), role="DOCTOR")

    response = await client.get("/api/v1/patients", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_all_patients_requires_authentication(client):
    response = await client.get("/api/v1/patients")
    assert response.status_code == 401
