from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.models import MembershipPlan, Patient, QRCard
from app.models.enums import GenderType, MembershipTier
from app.services.discount_engine import LineItemInput, calculate_invoice_breakdown

LINE_ITEMS = [
    LineItemInput(description="OPD Consultation", category="CONSULTATION", unit_price=Decimal("500.00")),
    LineItemInput(description="Blood Test", category="LAB", unit_price=Decimal("1000.00")),
    LineItemInput(description="Paracetamol", category="PHARMACY", unit_price=Decimal("200.00")),
]


async def _patient_with_plan(async_session, tier, consultation_pct, lab_pct, pharmacy_pct, display_id):
    plan = MembershipPlan(
        name=f"{tier.value} Plan",
        tier=tier,
        consultation_discount_pct=consultation_pct,
        lab_discount_pct=lab_pct,
        pharmacy_discount_pct=pharmacy_pct,
        validity_days=365,
    )
    async_session.add(plan)
    await async_session.flush()

    patient = Patient(
        patient_display_id=display_id,
        full_name="Billing Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500090",
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
    return patient, plan


@pytest.mark.asyncio
async def test_free_tier_applies_no_discount(async_session):
    patient, _plan = await _patient_with_plan(async_session, MembershipTier.FREE, 0, 0, 0, "SUR-2026-001001")

    summary = await calculate_invoice_breakdown(async_session, patient.patient_id, LINE_ITEMS)

    assert summary.gross_amount == Decimal("1700.00")
    assert summary.discount_amount == Decimal("0.00")
    assert summary.net_amount == Decimal("1700.00")


@pytest.mark.asyncio
async def test_silver_tier_applies_10_5_5_discount(async_session):
    patient, _plan = await _patient_with_plan(async_session, MembershipTier.SILVER, 10, 5, 5, "SUR-2026-001002")

    summary = await calculate_invoice_breakdown(async_session, patient.patient_id, LINE_ITEMS)

    # 500*0.90 + 1000*0.95 + 200*0.95 = 450 + 950 + 190 = 1590
    assert summary.net_amount == Decimal("1590.00")
    assert summary.discount_amount == Decimal("110.00")


@pytest.mark.asyncio
async def test_gold_tier_applies_20_15_10_discount(async_session):
    patient, _plan = await _patient_with_plan(async_session, MembershipTier.GOLD, 20, 15, 10, "SUR-2026-001003")

    summary = await calculate_invoice_breakdown(async_session, patient.patient_id, LINE_ITEMS)

    # 500*0.80 + 1000*0.85 + 200*0.90 = 400 + 850 + 180 = 1430
    assert summary.net_amount == Decimal("1430.00")
    assert summary.discount_amount == Decimal("270.00")


@pytest.mark.asyncio
async def test_platinum_tier_applies_30_25_15_discount(async_session):
    patient, _plan = await _patient_with_plan(async_session, MembershipTier.PLATINUM, 30, 25, 15, "SUR-2026-001004")

    summary = await calculate_invoice_breakdown(async_session, patient.patient_id, LINE_ITEMS)

    # 500*0.70 + 1000*0.75 + 200*0.85 = 350 + 750 + 170 = 1270
    assert summary.net_amount == Decimal("1270.00")
    assert summary.discount_amount == Decimal("430.00")


@pytest.mark.asyncio
async def test_patient_without_active_card_gets_no_discount(async_session):
    patient = Patient(
        patient_display_id="SUR-2026-001005",
        full_name="No Card Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500091",
    )
    async_session.add(patient)
    await async_session.commit()

    summary = await calculate_invoice_breakdown(async_session, patient.patient_id, LINE_ITEMS)

    assert summary.discount_amount == Decimal("0.00")
    assert summary.net_amount == Decimal("1700.00")
