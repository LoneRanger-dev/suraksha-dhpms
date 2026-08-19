import uuid

import pytest

from app.models import MembershipPlan
from app.models.enums import MembershipTier


async def _create_plan(async_session, name="Free", tier=MembershipTier.FREE, validity_days=365):
    plan = MembershipPlan(name=name, tier=tier, validity_days=validity_days)
    async_session.add(plan)
    await async_session.commit()
    return plan


def _payload(plan_id, phone="+919876500000", **overrides):
    base = {
        "full_name": "Test Patient",
        "dob": "1990-01-01",
        "gender": "MALE",
        "phone": phone,
        "password": "Patient@123",
        "emergency_contact_phone": "+919876500099",
        "plan_id": str(plan_id),
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_register_patient_creates_display_id_and_qr_card(client, async_session):
    plan = await _create_plan(async_session)

    response = await client.post("/api/v1/patients", json=_payload(plan.plan_id))

    assert response.status_code == 201
    body = response.json()
    assert body["patient_display_id"].startswith("SUR-")
    assert body["qr_card"]["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_get_patient_returns_registered_patient(client, async_session):
    plan = await _create_plan(async_session)

    create_resp = await client.post(
        "/api/v1/patients",
        json=_payload(plan.plan_id, phone="+919876500001", full_name="Lookup Patient"),
    )
    patient_id = create_resp.json()["patient_id"]

    get_resp = await client.get(f"/api/v1/patients/{patient_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["full_name"] == "Lookup Patient"


@pytest.mark.asyncio
async def test_get_unknown_patient_returns_404(client):
    response = await client.get(f"/api/v1/patients/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_register_patient_rejects_unknown_plan(client):
    response = await client.post(
        "/api/v1/patients",
        json=_payload(uuid.uuid4(), phone="+919876500005", full_name="Bad Plan Patient"),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_register_patient_creates_a_login_account(client, async_session):
    plan = await _create_plan(async_session)

    response = await client.post(
        "/api/v1/patients",
        json=_payload(plan.plan_id, phone="+919876500010", full_name="Login Patient"),
    )
    assert response.status_code == 201

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"phone": "+919876500010", "password": "Patient@123"},
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["role"] == "PATIENT"


@pytest.mark.asyncio
async def test_register_patient_rejects_duplicate_phone(client, async_session):
    plan = await _create_plan(async_session)

    first = await client.post(
        "/api/v1/patients",
        json=_payload(plan.plan_id, phone="+919876500011", full_name="First Patient"),
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/patients",
        json=_payload(plan.plan_id, phone="+919876500011", full_name="Second Patient"),
    )
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_patients_me_returns_own_dashboard_data(client, async_session):
    plan = await _create_plan(async_session, name="Family Gold", tier=MembershipTier.GOLD)

    await client.post(
        "/api/v1/patients",
        json=_payload(plan.plan_id, phone="+919876500012", full_name="Dashboard Patient"),
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"phone": "+919876500012", "password": "Patient@123"},
    )
    token = login_resp.json()["access_token"]

    response = await client.get("/api/v1/patients/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Dashboard Patient"
    assert body["membership_tier"] == "GOLD"
    assert body["membership_plan_name"] == "Family Gold"


@pytest.mark.asyncio
async def test_patients_me_requires_authentication(client):
    response = await client.get("/api/v1/patients/me")
    assert response.status_code == 401


async def _register_and_login(client, plan_id, phone, full_name):
    await client.post("/api/v1/patients", json=_payload(plan_id, phone=phone, full_name=full_name))
    login_resp = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "Patient@123"})
    return login_resp.json()["access_token"]


@pytest.mark.asyncio
async def test_add_family_member_inherits_primary_account_membership(client, async_session):
    plan = await _create_plan(async_session, name="Family Gold", tier=MembershipTier.GOLD)
    token = await _register_and_login(client, plan.plan_id, "+919876500020", "Primary Patient")

    response = await client.post(
        "/api/v1/patients/me/family",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Dependent Child",
            "dob": "2015-06-10",
            "gender": "MALE",
            "relationship_to_primary": "CHILD",
            "blood_group": "O+",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "Dependent Child"
    assert body["relationship_to_primary"] == "CHILD"
    assert body["patient_display_id"].startswith("SUR-")


@pytest.mark.asyncio
async def test_list_family_members_returns_only_own_dependents(client, async_session):
    plan = await _create_plan(async_session, name="Family Gold", tier=MembershipTier.GOLD)
    token_a = await _register_and_login(client, plan.plan_id, "+919876500021", "Primary A")
    token_b = await _register_and_login(client, plan.plan_id, "+919876500022", "Primary B")

    await client.post(
        "/api/v1/patients/me/family",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"full_name": "A's Spouse", "dob": "1992-01-01", "gender": "FEMALE", "relationship_to_primary": "SPOUSE"},
    )
    await client.post(
        "/api/v1/patients/me/family",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"full_name": "B's Parent", "dob": "1960-01-01", "gender": "MALE", "relationship_to_primary": "PARENT"},
    )

    response = await client.get("/api/v1/patients/me/family", headers={"Authorization": f"Bearer {token_a}"})

    assert response.status_code == 200
    names = [member["full_name"] for member in response.json()]
    assert names == ["A's Spouse"]


@pytest.mark.asyncio
async def test_add_family_member_requires_authentication(client):
    response = await client.post(
        "/api/v1/patients/me/family",
        json={"full_name": "Nobody", "dob": "2000-01-01", "gender": "MALE", "relationship_to_primary": "OTHER"},
    )
    assert response.status_code == 401
