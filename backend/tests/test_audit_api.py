from datetime import date

import pytest

from app.core.security import create_access_token, hash_password
from app.models import MembershipPlan, User
from app.models.enums import MembershipTier, UserRole


async def _create_plan(async_session):
    plan = MembershipPlan(name="Free", tier=MembershipTier.FREE, validity_days=365)
    async_session.add(plan)
    await async_session.commit()
    return plan


def _headers_for(user_id, role):
    token = create_access_token(subject=str(user_id), role=role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_super_admin_lists_audit_logs(client, async_session):
    plan = await _create_plan(async_session)

    admin = User(phone="+919000000090", password_hash=hash_password("x"), role=UserRole.SUPER_ADMIN)
    async_session.add(admin)
    await async_session.commit()
    await async_session.refresh(admin)

    await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Audit Trail Patient",
            "dob": "1990-01-01",
            "gender": "MALE",
            "phone": "+919876500600",
            "password": "Patient@123",
            "emergency_contact_phone": "+919876500099",
            "plan_id": str(plan.plan_id),
        },
    )

    response = await client.get("/api/v1/audit-logs", headers=_headers_for(admin.user_id, "SUPER_ADMIN"))

    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert body[0]["action"] == "CREATE"
    assert body[0]["entity_affected"] == "patient"


@pytest.mark.asyncio
async def test_non_admin_cannot_list_audit_logs(client, async_session):
    doctor_user = User(phone="+919000000091", password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doctor_user)
    await async_session.commit()
    await async_session.refresh(doctor_user)

    response = await client.get("/api/v1/audit-logs", headers=_headers_for(doctor_user.user_id, "DOCTOR"))

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_audit_logs_can_be_filtered_by_entity_id(client, async_session):
    plan = await _create_plan(async_session)

    admin = User(phone="+919000000092", password_hash=hash_password("x"), role=UserRole.SUPER_ADMIN)
    async_session.add(admin)
    await async_session.commit()
    await async_session.refresh(admin)

    create_resp = await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Filtered Patient",
            "dob": "1990-01-01",
            "gender": "MALE",
            "phone": "+919876500601",
            "password": "Patient@123",
            "emergency_contact_phone": "+919876500099",
            "plan_id": str(plan.plan_id),
        },
    )
    patient_id = create_resp.json()["patient_id"]

    response = await client.get(
        f"/api/v1/audit-logs?entity_id={patient_id}",
        headers=_headers_for(admin.user_id, "SUPER_ADMIN"),
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["entity_id"] == patient_id
