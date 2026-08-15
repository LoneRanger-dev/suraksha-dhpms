from datetime import date

import pytest

from app.models import Appointment, Department, Doctor, Patient, User
from app.models.enums import GenderType, UserRole
from app.services.queue_service import generate_queue_token


@pytest.mark.asyncio
async def test_first_token_of_the_day(async_session):
    dept = Department(name="Cardiology")
    async_session.add(dept)
    await async_session.flush()

    token = await generate_queue_token(async_session, dept, on_date=date(2026, 8, 14))
    assert token == "CARDIO-001"


@pytest.mark.asyncio
async def test_increments_for_existing_appointments_same_day(async_session):
    dept = Department(name="Cardiology")
    async_session.add(dept)
    await async_session.flush()

    doc_user = User(phone="+919000000001", password_hash="x", role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=dept.department_id,
        full_name="Dr. Test",
        qualification="MBBS",
        specialization="Cardiology",
    )
    async_session.add(doctor)
    await async_session.flush()

    patient = Patient(
        patient_display_id="SUR-2026-000700",
        full_name="Queue Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500098",
    )
    async_session.add(patient)
    await async_session.flush()

    existing = Appointment(
        patient_id=patient.patient_id,
        doctor_id=doctor.doctor_id,
        appointment_date=date(2026, 8, 14),
        time_slot="09:00",
        token_number="CARDIO-001",
    )
    async_session.add(existing)
    await async_session.commit()

    token = await generate_queue_token(async_session, dept, on_date=date(2026, 8, 14))
    assert token == "CARDIO-002"


@pytest.mark.asyncio
async def test_token_does_not_count_other_departments(async_session):
    cardio = Department(name="Cardiology")
    derma = Department(name="Dermatology")
    async_session.add_all([cardio, derma])
    await async_session.flush()

    doc_user = User(phone="+919000000002", password_hash="x", role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    derma_doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=derma.department_id,
        full_name="Dr. Derma",
        qualification="MBBS",
        specialization="Dermatology",
    )
    async_session.add(derma_doctor)
    await async_session.flush()

    patient = Patient(
        patient_display_id="SUR-2026-000701",
        full_name="Derma Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500097",
    )
    async_session.add(patient)
    await async_session.flush()

    async_session.add(
        Appointment(
            patient_id=patient.patient_id,
            doctor_id=derma_doctor.doctor_id,
            appointment_date=date(2026, 8, 14),
            time_slot="09:00",
            token_number="DERMAT-001",
        )
    )
    await async_session.commit()

    token = await generate_queue_token(async_session, cardio, on_date=date(2026, 8, 14))
    assert token == "CARDIO-001"
