import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import GUID
from app.models.base import Base
from app.models.enums import CardStatus


class QRCard(Base):
    __tablename__ = "qr_cards"

    card_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False
    )
    token_uuid: Mapped[uuid.UUID] = mapped_column(GUID(), unique=True, nullable=False, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("membership_plans.plan_id"), nullable=False)
    status: Mapped[CardStatus] = mapped_column(
        SAEnum(CardStatus, name="card_status"), nullable=False, default=CardStatus.ACTIVE
    )
    issued_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped["Patient"] = relationship(back_populates="qr_cards")
    plan: Mapped["MembershipPlan"] = relationship(back_populates="qr_cards")
