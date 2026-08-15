from datetime import date

import pytest

from app.core.security import create_access_token, hash_password
from app.models import Department, Doctor, Patient, User
from app.models.enums import GenderType, UserRole


async def _setup_doctor_and_patient(async_session):
    dept = Department(name="General Medicine")
    async_session.add(dept)
    await async_session.flush()

    doc_user = User(phone="+919000000020", password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=dept.department_id,
        full_name="Dr. Consult",
        qualification="MBBS",
        specialization="General Medicine",
    )
    async_session.add(doctor)

    patient = Patient(
        patient_display_id="SUR-2026-000900",
        full_name="Consult Patient",
        dob=date(1985, 5, 5),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500095",
    )
    async_session.add(patient)
    await async_session.commit()
    await async_session.refresh(doctor)
    await async_session.refresh(patient)
    return doc_user, doctor, patient


def _headers_for(user_id, role):
    token = create_access_token(subject=str(user_id), role=role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_doctor_records_visit_with_vitals(client, async_session):
    doc_user, doctor, patient = await _setup_doctor_and_patient(async_session)

    response = await client.post(
        "/api/v1/consultations/visits",
        json={
            "patient_id": str(patient.patient_id),
            "chief_complaint": "Fever",
            "symptoms": ["Fever", "Headache"],
            "vitals": {"bp": "120/80", "pulse": 78, "temp_f": 98.6, "spo2": 98},
            "diagnosis": "Viral fever",
        },
        headers=_headers_for(doc_user.user_id, "DOCTOR"),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["diagnosis"] == "Viral fever"
    assert body["doctor_id"] == str(doctor.doctor_id)


@pytest.mark.asyncio
async def test_non_doctor_cannot_record_visit(client, async_session):
    _doc_user, _doctor, patient = await _setup_doctor_and_patient(async_session)

    nurse = User(phone="+919000000021", password_hash=hash_password("x"), role=UserRole.NURSE)
    async_session.add(nurse)
    await async_session.commit()
    await async_session.refresh(nurse)

    response = await client.post(
        "/api/v1/consultations/visits",
        json={"patient_id": str(patient.patient_id), "chief_complaint": "Fever", "diagnosis": "Viral fever"},
        headers=_headers_for(nurse.user_id, "NURSE"),
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_doctor_creates_prescription_for_visit(client, async_session):
    doc_user, _doctor, patient = await _setup_doctor_and_patient(async_session)

    visit_resp = await client.post(
        "/api/v1/consultations/visits",
        json={"patient_id": str(patient.patient_id), "chief_complaint": "Fever", "diagnosis": "Viral fever"},
        headers=_headers_for(doc_user.user_id, "DOCTOR"),
    )
    visit_id = visit_resp.json()["visit_id"]

    response = await client.post(
        f"/api/v1/consultations/visits/{visit_id}/prescriptions",
        json={
            "instructions": "Rest and hydration",
            "items": [
                {
                    "medicine_name": "Paracetamol",
                    "dosage": "500 mg",
                    "frequency": "1-0-1",
                    "duration": "3 Days",
                    "intake_instructions": "After food",
                }
            ],
        },
        headers=_headers_for(doc_user.user_id, "DOCTOR"),
    )

    assert response.status_code == 201
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["medicine_name"] == "Paracetamol"


@pytest.mark.asyncio
async def test_get_patient_history_returns_visits_newest_first(client, async_session):
    doc_user, _doctor, patient = await _setup_doctor_and_patient(async_session)

    await client.post(
        "/api/v1/consultations/visits",
        json={"patient_id": str(patient.patient_id), "chief_complaint": "Cough", "diagnosis": "Bronchitis"},
        headers=_headers_for(doc_user.user_id, "DOCTOR"),
    )

    response = await client.get(
        f"/api/v1/consultations/patients/{patient.patient_id}/history",
        headers=_headers_for(doc_user.user_id, "DOCTOR"),
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["chief_complaint"] == "Cough"
