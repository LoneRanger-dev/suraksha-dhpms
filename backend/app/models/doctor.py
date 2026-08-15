import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import GUID, JSONVariant
from app.models.base import Base


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("departments.department_id"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    qualification: Mapped[str] = mapped_column(String(100), nullable=False)
    specialization: Mapped[str] = mapped_column(String(100), nullable=False)
    consultation_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("500.00"))
    room_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    availability_schedule: Mapped[dict | None] = mapped_column(JSONVariant, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="doctor_profiles")
    department: Mapped["Department"] = relationship(back_populates="doctors")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="doctor")
