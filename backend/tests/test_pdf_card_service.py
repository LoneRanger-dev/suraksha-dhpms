import uuid
from datetime import date, timedelta

from app.models import MembershipPlan, Patient, QRCard
from app.models.enums import CardStatus, GenderType, MembershipTier
from app.services.pdf_card_service import generate_health_card_pdf


def test_generates_valid_pdf_bytes():
    patient = Patient(
        patient_display_id="SUR-2026-000099",
        full_name="Manvith M N",
        dob=date(2005, 9, 4),
        gender=GenderType.MALE,
        blood_group="B+",
        known_allergies="Penicillin",
        emergency_contact_phone="+918005550199",
    )
    plan = MembershipPlan(name="Gold", tier=MembershipTier.GOLD)
    card = QRCard(
        patient_id=uuid.uuid4(),
        token_uuid=uuid.uuid4(),
        plan_id=uuid.uuid4(),
        status=CardStatus.ACTIVE,
        issued_date=date.today(),
        expiry_date=date.today() + timedelta(days=365),
    )

    pdf_bytes = generate_health_card_pdf(patient, card, plan)

    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 500
