import pytest

from app.models import MembershipPlan
from app.models.enums import MembershipTier


async def _create_plan(async_session, name="Free", tier=MembershipTier.FREE, validity_days=365):
    plan = MembershipPlan(name=name, tier=tier, validity_days=validity_days)
    async_session.add(plan)
    await async_session.commit()
    return plan


@pytest.mark.asyncio
async def test_register_patient_creates_display_id_and_qr_card(client, async_session):
    plan = await _create_plan(async_session)

    response = await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Test Patient",
            "dob": "1990-01-01",
            "gender": "MALE",
            "emergency_contact_phone": "+919876500000",
            "plan_id": str(plan.plan_id),
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["patient_display_id"].startswith("SUR-")
    assert body["qr_card"]["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_get_patient_returns_registered_patient(client, async_session):
    plan = await _create_plan(async_session)

    create_resp = await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Lookup Patient",
            "dob": "1988-06-15",
            "gender": "FEMALE",
            "emergency_contact_phone": "+919876500001",
            "plan_id": str(plan.plan_id),
        },
    )
    patient_id = create_resp.json()["patient_id"]

    get_resp = await client.get(f"/api/v1/patients/{patient_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["full_name"] == "Lookup Patient"


@pytest.mark.asyncio
async def test_get_unknown_patient_returns_404(client):
    import uuid

    response = await client.get(f"/api/v1/patients/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_register_patient_rejects_unknown_plan(client):
    import uuid

    response = await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Bad Plan Patient",
            "dob": "1990-01-01",
            "gender": "MALE",
            "emergency_contact_phone": "+919876500005",
            "plan_id": str(uuid.uuid4()),
        },
    )
    assert response.status_code == 404
