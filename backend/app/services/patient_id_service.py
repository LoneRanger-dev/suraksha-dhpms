from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Patient


async def generate_patient_display_id(db: AsyncSession) -> str:
    """Formats a Universal Patient ID as SUR-YYYY-NNNNNN, sequential per year."""
    year = date.today().year
    prefix = f"SUR-{year}-"

    result = await db.execute(
        select(func.count()).select_from(Patient).where(Patient.patient_display_id.like(f"{prefix}%"))
    )
    count = result.scalar_one()

    return f"{prefix}{count + 1:06d}"
