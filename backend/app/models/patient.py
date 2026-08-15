import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import GUID
from app.models.base import Base
from app.models.enums import GenderType


class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    primary_account_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("patients.patient_id", ondelete="SET NULL"), nullable=True
    )
    relationship_to_primary: Mapped[str] = mapped_column(String(50), nullable=False, default="SELF")
    patient_display_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    abha_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    dob: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[GenderType] = mapped_column(SAEnum(GenderType, name="gender_type"), nullable=False)
    blood_group: Mapped[str | None] = mapped_column(String(5), nullable=True)
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    known_allergies: Mapped[str] = mapped_column(Text, nullable=False, default="None")
    existing_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User | None"] = relationship(back_populates="patients", foreign_keys=[user_id])
    primary_account: Mapped["Patient | None"] = relationship(remote_side=[patient_id])
    qr_cards: Mapped[list["QRCard"]] = relationship(back_populates="patient")
