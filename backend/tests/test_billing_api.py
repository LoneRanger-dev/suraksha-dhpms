import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.models import AuditLog, MembershipPlan, Patient, QRCard, User
from app.models.enums import GenderType, MembershipTier, UserRole


@pytest.mark.asyncio
async def test_receptionist_creates_invoice_with_membership_discount(client, async_session):
    plan = MembershipPlan(
        name="Gold",
        tier=MembershipTier.GOLD,
        consultation_discount_pct=20,
        lab_discount_pct=15,
        pharmacy_discount_pct=10,
        validity_days=365,
    )
    async_session.add(plan)
    await async_session.flush()

    patient = Patient(
        patient_display_id="SUR-2026-001100",
        full_name="Invoice Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500092",
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

    receptionist = User(phone="+919000000030", password_hash=hash_password("x"), role=UserRole.RECEPTIONIST)
    async_session.add(receptionist)
    await async_session.commit()
    await async_session.refresh(receptionist)

    token = create_access_token(subject=str(receptionist.user_id), role="RECEPTIONIST")

    response = await client.post(
        "/api/v1/billing/invoices",
        json={
            "patient_id": str(patient.patient_id),
            "items": [{"description": "OPD Consultation", "category": "CONSULTATION", "unit_price": "500.00"}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    body = response.json()
    assert Decimal(str(body["net_amount"])) == Decimal("400.00")

    invoice_id = uuid.UUID(body["invoice_id"])
    result = await async_session.execute(select(AuditLog).where(AuditLog.entity_id == invoice_id))
    logs = result.scalars().all()
    assert len(logs) == 1
    assert logs[0].action == "CREATE"
    assert logs[0].entity_affected == "invoice"
    assert logs[0].performed_by == receptionist.user_id
    assert Decimal(str(body["discount_amount"])) == Decimal("100.00")
    assert len(body["items"]) == 1


@pytest.mark.asyncio
async def test_billing_requires_staff_role(client, async_session):
    patient = Patient(
        patient_display_id="SUR-2026-001101",
        full_name="Unauthorized Test",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500093",
    )
    async_session.add(patient)
    await async_session.commit()

    response = await client.post(
        "/api/v1/billing/invoices",
        json={"patient_id": str(patient.patient_id), "items": []},
    )

    assert response.status_code == 401


async def _create_invoice(client, async_session, phone, patient_display_id, patient_name, unit_price="500.00"):
    plan = MembershipPlan(name="Free", tier=MembershipTier.FREE, validity_days=365)
    async_session.add(plan)
    await async_session.flush()

    patient = Patient(
        patient_display_id=patient_display_id,
        full_name=patient_name,
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500094",
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

    receptionist = User(phone=phone, password_hash=hash_password("x"), role=UserRole.RECEPTIONIST)
    async_session.add(receptionist)
    await async_session.commit()
    await async_session.refresh(receptionist)

    token = create_access_token(subject=str(receptionist.user_id), role="RECEPTIONIST")
    response = await client.post(
        "/api/v1/billing/invoices",
        json={
            "patient_id": str(patient.patient_id),
            "items": [{"description": "OPD Consultation", "category": "CONSULTATION", "unit_price": unit_price}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    return response.json()


def _admin_headers():
    token = create_access_token(subject="00000000-0000-0000-0000-000000000099", role="SUPER_ADMIN")
    return {"Authorization": f"Bearer {token}"}


async def _seed_admin(async_session):
    async_session.add(
        User(
            user_id="00000000-0000-0000-0000-000000000099",
            phone="+919000000099",
            password_hash=hash_password("x"),
            role=UserRole.SUPER_ADMIN,
        )
    )
    await async_session.commit()


@pytest.mark.asyncio
async def test_admin_lists_all_invoices(client, async_session):
    await _create_invoice(client, async_session, "+919000000040", "SUR-2026-001200", "Billing List Patient")
    await _seed_admin(async_session)

    response = await client.get("/api/v1/billing/invoices", headers=_admin_headers())

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["patient_full_name"] == "Billing List Patient"
    assert body[0]["patient_display_id"] == "SUR-2026-001200"


@pytest.mark.asyncio
async def test_non_billing_role_cannot_list_invoices(client, async_session):
    doctor = User(phone="+919000000041", password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doctor)
    await async_session.commit()
    await async_session.refresh(doctor)
    token = create_access_token(subject=str(doctor.user_id), role="DOCTOR")

    response = await client.get("/api/v1/billing/invoices", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_gets_billing_summary(client, async_session):
    await _create_invoice(client, async_session, "+919000000042", "SUR-2026-001201", "Summary Patient One", "500.00")
    await _create_invoice(client, async_session, "+919000000043", "SUR-2026-001202", "Summary Patient Two", "300.00")
    await _seed_admin(async_session)

    response = await client.get("/api/v1/billing/summary", headers=_admin_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["invoice_count"] == 2
    assert Decimal(str(body["total_gross"])) == Decimal("800.00")
    assert Decimal(str(body["total_net"])) == Decimal("800.00")
