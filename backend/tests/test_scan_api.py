import uuid
from datetime import date, timedelta

import pytest

from app.core.security import create_access_token, hash_password
from app.models import MembershipPlan, Patient, QRCard, User
from app.models.enums import GenderType, MembershipTier, UserRole


async def _register_patient_with_card(async_session, allergies="Penicillin"):
    plan = MembershipPlan(name="Gold", tier=MembershipTier.GOLD, validity_days=365)
    async_session.add(plan)
    await async_session.flush()

    patient = Patient(
        patient_display_id="SUR-2026-000500",
        full_name="Scan Test Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        blood_group="B+",
        known_allergies=allergies,
        emergency_contact_phone="+919876500099",
    )
    async_session.add(patient)
    await async_session.flush()

    card = QRCard(
        patient_id=patient.patient_id,
        plan_id=plan.plan_id,
        issued_date=date.today(),
        expiry_date=date.today() + timedelta(days=365),
    )
    async_session.add(card)
    await async_session.commit()
    await async_session.refresh(card)
    return patient, card


@pytest.mark.asyncio
async def test_scan_unauthenticated_returns_restricted_emergency_view(client, async_session):
    _patient, card = await _register_patient_with_card(async_session)

    response = await client.get(f"/api/v1/scan/{card.token_uuid}")

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Scan Test Patient"
    assert body["blood_group"] == "B+"
    assert body["allergies"] == "Penicillin"
    assert "medical_history" not in body
    assert "patient_display_id" not in body


@pytest.mark.asyncio
async def test_scan_as_receptionist_returns_full_dossier(client, async_session):
    _patient, card = await _register_patient_with_card(async_session)

    staff = User(phone="+919999998888", password_hash=hash_password("x"), role=UserRole.RECEPTIONIST)
    async_session.add(staff)
    await async_session.commit()
    await async_session.refresh(staff)

    token = create_access_token(subject=str(staff.user_id), role="RECEPTIONIST")

    response = await client.get(f"/api/v1/scan/{card.token_uuid}", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["patient_display_id"] == "SUR-2026-000500"
    assert body["membership_tier"] == "GOLD"


@pytest.mark.asyncio
async def test_scan_unknown_token_returns_404(client):
    response = await client.get(f"/api/v1/scan/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_scan_by_printed_patient_display_id_resolves_same_card(client, async_session):
    """A receptionist typing the human-readable ID from the confirmation
    screen/wristband must resolve the same card as scanning the QR token."""
    _patient, card = await _register_patient_with_card(async_session)

    response = await client.get("/api/v1/scan/SUR-2026-000500")

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Scan Test Patient"


@pytest.mark.asyncio
async def test_scan_unknown_patient_display_id_returns_404(client):
    response = await client.get("/api/v1/scan/SUR-2026-999999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_scan_as_pharmacist_returns_full_dossier(client, async_session):
    """A pharmacist needs patient_id from the scan to look up prescriptions to dispense."""
    _patient, card = await _register_patient_with_card(async_session)

    staff = User(phone="+919999998889", password_hash=hash_password("x"), role=UserRole.PHARMACIST)
    async_session.add(staff)
    await async_session.commit()
    await async_session.refresh(staff)

    token = create_access_token(subject=str(staff.user_id), role="PHARMACIST")

    response = await client.get(f"/api/v1/scan/{card.token_uuid}", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["patient_display_id"] == "SUR-2026-000500"
