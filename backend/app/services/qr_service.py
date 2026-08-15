from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MembershipPlan, Patient, QRCard


async def issue_qr_card(db: AsyncSession, patient: Patient, plan: MembershipPlan) -> QRCard:
    """Issues a non-guessable UUIDv4-tokenized QR card for a patient under a plan."""
    issued_date = date.today()
    card = QRCard(
        patient_id=patient.patient_id,
        plan_id=plan.plan_id,
        issued_date=issued_date,
        expiry_date=issued_date + timedelta(days=plan.validity_days),
    )
    db.add(card)
    await db.flush()
    return card
