from datetime import date

import pytest

from app.core.security import create_access_token, hash_password
from app.models import Department, Doctor, Patient, User
from app.models.enums import GenderType, UserRole


async def _setup_patient_and_doctor(async_session):
    dept = Department(name="Cardiology")
    async_session.add(dept)
    await async_session.flush()

    doc_user = User(phone="+919000000010", password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=dept.department_id,
        full_name="Dr. Check-in",
        qualification="MBBS",
        specialization="Cardiology",
    )
    async_session.add(doctor)

    patient = Patient(
        patient_display_id="SUR-2026-000800",
        full_name="Checkin Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500096",
    )
    async_session.add(patient)
    await async_session.commit()
    await async_session.refresh(doctor)
    await async_session.refresh(patient)
    return patient, doctor


def _staff_headers(role="RECEPTIONIST"):
    token = create_access_token(subject="00000000-0000-0000-0000-000000000001", role=role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_receptionist_can_check_in_patient_to_queue(client, async_session):
    patient, doctor = await _setup_patient_and_doctor(async_session)

    receptionist = User(
        user_id="00000000-0000-0000-0000-000000000001",
        phone="+919000000011",
        password_hash=hash_password("x"),
        role=UserRole.RECEPTIONIST,
    )
    async_session.add(receptionist)
    await async_session.commit()

    response = await client.post(
        "/api/v1/appointments/queue",
        json={"patient_id": str(patient.patient_id), "doctor_id": str(doctor.doctor_id)},
        headers=_staff_headers(),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["token_number"].startswith("CARDIO-")
    assert body["status"] == "CHECKED_IN"


@pytest.mark.asyncio
async def test_check_in_requires_staff_auth(client, async_session):
    patient, doctor = await _setup_patient_and_doctor(async_session)

    response = await client.post(
        "/api/v1/appointments/queue",
        json={"patient_id": str(patient.patient_id), "doctor_id": str(doctor.doctor_id)},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_check_in_rejects_patient_role(client, async_session):
    patient, doctor = await _setup_patient_and_doctor(async_session)

    patient_user = User(
        user_id="00000000-0000-0000-0000-000000000001",
        phone="+919000000012",
        password_hash=hash_password("x"),
        role=UserRole.PATIENT,
    )
    async_session.add(patient_user)
    await async_session.commit()

    response = await client.post(
        "/api/v1/appointments/queue",
        json={"patient_id": str(patient.patient_id), "doctor_id": str(doctor.doctor_id)},
        headers=_staff_headers(role="PATIENT"),
    )

    assert response.status_code == 403
