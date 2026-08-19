import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import GUID, JSONVariant
from app.models.base import Base


class Visit(Base):
    __tablename__ = "visits"

    visit_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("appointments.appointment_id", ondelete="SET NULL"), nullable=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("doctors.doctor_id", ondelete="CASCADE"), nullable=False
    )
    visit_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=False)
    symptoms: Mapped[list | None] = mapped_column(JSONVariant, nullable=True)
    vitals: Mapped[dict | None] = mapped_column(JSONVariant, nullable=True)
    diagnosis: Mapped[str] = mapped_column(Text, nullable=False)
    doctor_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    appointment: Mapped["Appointment | None"] = relationship(back_populates="visits")
    patient: Mapped["Patient"] = relationship()
    doctor: Mapped["Doctor"] = relationship()
    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="visit")
