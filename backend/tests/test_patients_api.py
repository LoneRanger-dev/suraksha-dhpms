import uuid
from datetime import date

import pytest
from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.models import AuditLog, Department, Doctor, MembershipPlan, User
from app.models.enums import MembershipTier, UserRole


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
async def test_register_patient_writes_audit_log(client, async_session):
    plan = await _create_plan(async_session)

    response = await client.post("/api/v1/patients", json=_payload(plan.plan_id, phone="+919876500050"))
    assert response.status_code == 201
    patient_id = uuid.UUID(response.json()["patient_id"])

    result = await async_session.execute(select(AuditLog).where(AuditLog.entity_id == patient_id))
    logs = result.scalars().all()

    assert len(logs) == 1
    assert logs[0].action == "CREATE"
    assert logs[0].entity_affected == "patient"


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


async def _register_and_login(client, plan_id, phone, full_name="Records Patient"):
    resp = await client.post("/api/v1/patients", json=_payload(plan_id, phone=phone, full_name=full_name))
    login = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "Patient@123"})
    return resp.json(), login.json()["access_token"]


@pytest.mark.asyncio
async def test_add_family_member_inherits_primary_account_membership(client, async_session):
    plan = await _create_plan(async_session, name="Family Gold", tier=MembershipTier.GOLD)
    _body, token = await _register_and_login(client, plan.plan_id, "+919876500020", "Primary Patient")

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
    _body_a, token_a = await _register_and_login(client, plan.plan_id, "+919876500021", "Primary A")
    _body_b, token_b = await _register_and_login(client, plan.plan_id, "+919876500022", "Primary B")

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


async def _setup_doctor(async_session, phone="+919000000040"):
    dept = Department(name="General Medicine")
    async_session.add(dept)
    await async_session.flush()

    doc_user = User(phone=phone, password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=dept.department_id,
        full_name="Dr. Records",
        qualification="MBBS",
        specialization="General Medicine",
    )
    async_session.add(doctor)
    await async_session.commit()
    await async_session.refresh(doctor)
    return doc_user, doctor


@pytest.mark.asyncio
async def test_patients_me_records_lists_own_visits_prescriptions_and_invoices(client, async_session):
    plan = await _create_plan(async_session, name="Family Gold", tier=MembershipTier.GOLD)
    patient_body, token = await _register_and_login(client, plan.plan_id, "+919876500040")
    doc_user, _doctor = await _setup_doctor(async_session)
    doctor_headers = {"Authorization": f"Bearer {create_access_token(subject=str(doc_user.user_id), role='DOCTOR')}"}

    visit_resp = await client.post(
        "/api/v1/consultations/visits",
        json={"patient_id": patient_body["patient_id"], "chief_complaint": "Cough", "diagnosis": "Bronchitis"},
        headers=doctor_headers,
    )
    assert visit_resp.status_code == 201
    visit_id = visit_resp.json()["visit_id"]

    rx_resp = await client.post(
        f"/api/v1/consultations/visits/{visit_id}/prescriptions",
        json={"items": [{"medicine_name": "Azithromycin", "dosage": "500 mg", "frequency": "1-0-0", "duration": "5 Days"}]},
        headers=doctor_headers,
    )
    assert rx_resp.status_code == 201

    staff_token = create_access_token(subject="00000000-0000-0000-0000-000000000099", role="RECEPTIONIST")
    async_session.add(
        User(
            user_id="00000000-0000-0000-0000-000000000099",
            phone="+919000000041",
            password_hash=hash_password("x"),
            role=UserRole.RECEPTIONIST,
        )
    )
    await async_session.commit()
    invoice_resp = await client.post(
        "/api/v1/billing/invoices",
        json={
            "patient_id": patient_body["patient_id"],
            "visit_id": visit_id,
            "items": [{"description": "Consultation Fee", "category": "CONSULTATION", "unit_price": "500.00"}],
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert invoice_resp.status_code == 201

    headers = {"Authorization": f"Bearer {token}"}
    visits = await client.get("/api/v1/patients/me/visits", headers=headers)
    prescriptions = await client.get("/api/v1/patients/me/prescriptions", headers=headers)
    invoices = await client.get("/api/v1/patients/me/invoices", headers=headers)

    assert visits.status_code == 200
    assert len(visits.json()) == 1
    assert visits.json()[0]["diagnosis"] == "Bronchitis"

    assert prescriptions.status_code == 200
    assert len(prescriptions.json()) == 1
    assert prescriptions.json()[0]["items"][0]["medicine_name"] == "Azithromycin"

    assert invoices.status_code == 200
    assert len(invoices.json()) == 1
    assert invoices.json()[0]["net_amount"] == "500.00"


@pytest.mark.asyncio
async def test_patients_me_records_endpoints_require_authentication(client):
    assert (await client.get("/api/v1/patients/me/visits")).status_code == 401
    assert (await client.get("/api/v1/patients/me/prescriptions")).status_code == 401
    assert (await client.get("/api/v1/patients/me/invoices")).status_code == 401
