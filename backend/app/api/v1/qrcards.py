import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import MembershipPlan, Patient, QRCard
from app.services.pdf_card_service import generate_health_card_pdf

router = APIRouter(prefix="/api/v1/qrcards", tags=["qrcards"])


@router.get("/{card_id}/card.pdf")
async def download_qr_card_pdf(card_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Response:
    card = await db.get(QRCard, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR card not found")

    patient = await db.get(Patient, card.patient_id)
    plan = await db.get(MembershipPlan, card.plan_id)

    pdf_bytes = generate_health_card_pdf(patient, card, plan)
    return Response(content=pdf_bytes, media_type="application/pdf")
