from datetime import date

import pytest

from app.models import Patient
from app.models.enums import GenderType
from app.services.patient_id_service import generate_patient_display_id


@pytest.mark.asyncio
async def test_generates_first_id_of_the_year(async_session):
    display_id = await generate_patient_display_id(async_session)
    year = date.today().year
    assert display_id == f"SUR-{year}-000001"


@pytest.mark.asyncio
async def test_increments_sequence_for_existing_patients(async_session):
    year = date.today().year
    existing = Patient(
        patient_display_id=f"SUR-{year}-000001",
        full_name="Existing Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500000",
    )
    async_session.add(existing)
    await async_session.commit()

    display_id = await generate_patient_display_id(async_session)
    assert display_id == f"SUR-{year}-000002"
