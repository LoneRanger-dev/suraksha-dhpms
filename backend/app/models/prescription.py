import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import GUID
from app.models.base import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    prescription_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    visit_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("visits.visit_id", ondelete="CASCADE"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("doctors.doctor_id", ondelete="CASCADE"), nullable=False
    )
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    visit: Mapped["Visit"] = relationship(back_populates="prescriptions")
    patient: Mapped["Patient"] = relationship()
    doctor: Mapped["Doctor"] = relationship()
    items: Mapped[list["PrescriptionItem"]] = relationship(back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    item_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    prescription_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("prescriptions.prescription_id", ondelete="CASCADE"), nullable=False
    )
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str] = mapped_column(String(50), nullable=False)
    frequency: Mapped[str] = mapped_column(String(50), nullable=False)
    duration: Mapped[str] = mapped_column(String(50), nullable=False)
    intake_instructions: Mapped[str | None] = mapped_column(String(100), nullable=True)

    prescription: Mapped["Prescription"] = relationship(back_populates="items")
