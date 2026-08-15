from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.core.security import create_access_token, hash_password
from app.models import MembershipPlan, Patient, QRCard, User
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
