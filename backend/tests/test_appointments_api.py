from datetime import date, timedelta

import pytest

from app.core.security import create_access_token, hash_password
from app.models import Department, Doctor, MembershipPlan, Patient, User
from app.models.enums import GenderType, MembershipTier, UserRole


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


@pytest.mark.asyncio
async def test_doctor_sees_only_their_own_queue_by_default(client, async_session):
    patient, doctor = await _setup_patient_and_doctor(async_session)

    receptionist = User(
        user_id="00000000-0000-0000-0000-000000000001",
        phone="+919000000013",
        password_hash=hash_password("x"),
        role=UserRole.RECEPTIONIST,
    )
    async_session.add(receptionist)
    await async_session.commit()

    checkin = await client.post(
        "/api/v1/appointments/queue",
        json={"patient_id": str(patient.patient_id), "doctor_id": str(doctor.doctor_id)},
        headers=_staff_headers(),
    )
    assert checkin.status_code == 201

    doctor_token = create_access_token(subject=str(doctor.user_id), role="DOCTOR")
    response = await client.get(
        "/api/v1/appointments", headers={"Authorization": f"Bearer {doctor_token}"}
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["patient_display_id"] == "SUR-2026-000800"
    assert body[0]["patient_full_name"] == "Checkin Patient"
    assert body[0]["doctor_full_name"] == "Dr. Check-in"


@pytest.mark.asyncio
async def test_appointments_list_requires_staff_auth(client):
    response = await client.get("/api/v1/appointments")
    assert response.status_code == 401


async def _register_patient(client, async_session, phone, full_name="Booking Patient"):
    plan = MembershipPlan(name="Free", tier=MembershipTier.FREE, validity_days=365)
    async_session.add(plan)
    await async_session.commit()

    resp = await client.post(
        "/api/v1/patients",
        json={
            "full_name": full_name,
            "dob": "1990-01-01",
            "gender": "MALE",
            "phone": phone,
            "password": "Patient@123",
            "emergency_contact_phone": "+919876500097",
            "plan_id": str(plan.plan_id),
        },
    )
    login = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "Patient@123"})
    return resp.json(), login.json()["access_token"]


@pytest.mark.asyncio
async def test_patient_books_an_appointment_for_themselves(client, async_session):
    _patient, doctor = await _setup_patient_and_doctor(async_session)
    _patient_body, token = await _register_patient(client, async_session, "+919876500030")

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    response = await client.post(
        "/api/v1/appointments/book",
        headers={"Authorization": f"Bearer {token}"},
        json={"doctor_id": str(doctor.doctor_id), "appointment_date": tomorrow, "time_slot": "10:30"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "SCHEDULED"
    assert body["token_number"].startswith("CARDIO-")


@pytest.mark.asyncio
async def test_patient_cannot_book_for_an_unrelated_patient(client, async_session):
    _patient, doctor = await _setup_patient_and_doctor(async_session)
    _body, token = await _register_patient(client, async_session, "+919876500031")

    import uuid

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    response = await client.post(
        "/api/v1/appointments/book",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "doctor_id": str(doctor.doctor_id),
            "appointment_date": tomorrow,
            "time_slot": "10:30",
            "patient_id": str(uuid.uuid4()),
        },
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_receptionist_can_book_on_behalf_of_a_patient(client, async_session):
    patient, doctor = await _setup_patient_and_doctor(async_session)

    receptionist = User(
        user_id="00000000-0000-0000-0000-000000000001",
        phone="+919000000014",
        password_hash=hash_password("x"),
        role=UserRole.RECEPTIONIST,
    )
    async_session.add(receptionist)
    await async_session.commit()

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    response = await client.post(
        "/api/v1/appointments/book",
        headers=_staff_headers(),
        json={
            "doctor_id": str(doctor.doctor_id),
            "appointment_date": tomorrow,
            "time_slot": "11:00",
            "patient_id": str(patient.patient_id),
        },
    )

    assert response.status_code == 201


@pytest.mark.asyncio
async def test_patients_me_appointments_lists_own_bookings(client, async_session):
    _patient, doctor = await _setup_patient_and_doctor(async_session)
    _body, token = await _register_patient(client, async_session, "+919876500032")

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    await client.post(
        "/api/v1/appointments/book",
        headers={"Authorization": f"Bearer {token}"},
        json={"doctor_id": str(doctor.doctor_id), "appointment_date": tomorrow, "time_slot": "09:00"},
    )

    response = await client.get("/api/v1/patients/me/appointments", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["doctor_full_name"] == "Dr. Check-in"
    assert body[0]["status"] == "SCHEDULED"
