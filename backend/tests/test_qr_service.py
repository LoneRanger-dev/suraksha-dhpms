from datetime import date, timedelta

import pytest

from app.models import MembershipPlan, Patient
from app.models.enums import GenderType, MembershipTier
from app.services.qr_service import issue_qr_card


@pytest.mark.asyncio
async def test_issue_qr_card_sets_expiry_from_plan_validity(async_session):
    plan = MembershipPlan(name="Gold", tier=MembershipTier.GOLD, validity_days=365)
    async_session.add(plan)
    await async_session.flush()

    patient = Patient(
        patient_display_id="SUR-2026-000010",
        full_name="Card Patient",
        dob=date(1985, 3, 3),
        gender=GenderType.FEMALE,
        emergency_contact_phone="+919876500002",
    )
    async_session.add(patient)
    await async_session.flush()

    card = await issue_qr_card(async_session, patient, plan)
    await async_session.commit()

    assert card.token_uuid is not None
    assert card.status.value == "ACTIVE"
    assert card.expiry_date == date.today() + timedelta(days=365)


@pytest.mark.asyncio
async def test_each_card_gets_a_unique_token(async_session):
    plan = MembershipPlan(name="Silver", tier=MembershipTier.SILVER, validity_days=180)
    async_session.add(plan)
    await async_session.flush()

    patient_a = Patient(
        patient_display_id="SUR-2026-000011",
        full_name="A",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500003",
    )
    patient_b = Patient(
        patient_display_id="SUR-2026-000012",
        full_name="B",
        dob=date(1991, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500004",
    )
    async_session.add_all([patient_a, patient_b])
    await async_session.flush()

    card_a = await issue_qr_card(async_session, patient_a, plan)
    card_b = await issue_qr_card(async_session, patient_b, plan)
    await async_session.commit()

    assert card_a.token_uuid != card_b.token_uuid
