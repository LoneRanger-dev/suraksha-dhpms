from datetime import date, timedelta

import pytest

from app.core.security import create_access_token, hash_password
from app.models import Department, Doctor, MembershipPlan, Patient, User
from app.models.enums import GenderType, MembershipTier, UserRole


async def _setup_doctor(async_session, phone="+919000000070"):
    dept = Department(name="General Medicine")
    async_session.add(dept)
    await async_session.flush()

    doc_user = User(phone=phone, password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=dept.department_id,
        full_name="Dr. Notify",
        qualification="MBBS",
        specialization="General Medicine",
    )
    async_session.add(doctor)
    await async_session.commit()
    await async_session.refresh(doctor)
    return doc_user, doctor


async def _register_and_login(client, plan_id, phone, full_name="Notify Patient"):
    resp = await client.post(
        "/api/v1/patients",
        json={
            "full_name": full_name,
            "dob": "1990-01-01",
            "gender": "MALE",
            "phone": phone,
            "password": "Patient@123",
            "emergency_contact_phone": "+919876500099",
            "plan_id": str(plan_id),
        },
    )
    login = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "Patient@123"})
    return resp.json(), login.json()["access_token"]


@pytest.mark.asyncio
async def test_booking_an_appointment_notifies_the_doctor_and_patient(client, async_session):
    plan = MembershipPlan(name="Free", tier=MembershipTier.FREE, validity_days=365)
    async_session.add(plan)
    await async_session.commit()
    await async_session.refresh(plan)

    doc_user, doctor = await _setup_doctor(async_session)
    patient_body, patient_token = await _register_and_login(client, plan.plan_id, "+919876500080")

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    book_resp = await client.post(
        "/api/v1/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={"doctor_id": str(doctor.doctor_id), "appointment_date": tomorrow, "time_slot": "10:00"},
    )
    assert book_resp.status_code == 201

    doctor_token = create_access_token(subject=str(doc_user.user_id), role="DOCTOR")
    doctor_notifs = await client.get(
        "/api/v1/notifications/me", headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert doctor_notifs.status_code == 200
    assert len(doctor_notifs.json()) == 1
    assert "Notify Patient" in doctor_notifs.json()[0]["message"]
    assert doctor_notifs.json()[0]["is_read"] is False

    patient_notifs = await client.get(
        "/api/v1/notifications/me", headers={"Authorization": f"Bearer {patient_token}"}
    )
    assert patient_notifs.status_code == 200
    assert len(patient_notifs.json()) == 1
    assert "Dr. Notify" in patient_notifs.json()[0]["message"]


@pytest.mark.asyncio
async def test_receptionist_check_in_notifies_the_doctor(client, async_session):
    dept = Department(name="Cardiology")
    async_session.add(dept)
    await async_session.flush()

    doc_user = User(phone="+919000000071", password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()
    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=dept.department_id,
        full_name="Dr. Checkin Notify",
        qualification="MBBS",
        specialization="Cardiology",
    )
    async_session.add(doctor)

    patient = Patient(
        patient_display_id="SUR-2026-000950",
        full_name="Checked In Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500098",
    )
    async_session.add(patient)

    receptionist = User(
        user_id="00000000-0000-0000-0000-000000000060",
        phone="+919000000072",
        password_hash=hash_password("x"),
        role=UserRole.RECEPTIONIST,
    )
    async_session.add(receptionist)
    await async_session.commit()
    await async_session.refresh(doctor)
    await async_session.refresh(patient)

    receptionist_token = create_access_token(subject="00000000-0000-0000-0000-000000000060", role="RECEPTIONIST")
    checkin = await client.post(
        "/api/v1/appointments/queue",
        json={"patient_id": str(patient.patient_id), "doctor_id": str(doctor.doctor_id)},
        headers={"Authorization": f"Bearer {receptionist_token}"},
    )
    assert checkin.status_code == 201

    doctor_token = create_access_token(subject=str(doc_user.user_id), role="DOCTOR")
    notifs = await client.get("/api/v1/notifications/me", headers={"Authorization": f"Bearer {doctor_token}"})
    assert notifs.status_code == 200
    assert len(notifs.json()) == 1
    assert "Checked In Patient" in notifs.json()[0]["message"]


@pytest.mark.asyncio
async def test_mark_notification_as_read(client, async_session):
    plan = MembershipPlan(name="Free", tier=MembershipTier.FREE, validity_days=365)
    async_session.add(plan)
    await async_session.commit()
    await async_session.refresh(plan)

    doc_user, doctor = await _setup_doctor(async_session, phone="+919000000073")
    _patient_body, patient_token = await _register_and_login(client, plan.plan_id, "+919876500081")

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    await client.post(
        "/api/v1/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={"doctor_id": str(doctor.doctor_id), "appointment_date": tomorrow, "time_slot": "10:00"},
    )

    doctor_token = create_access_token(subject=str(doc_user.user_id), role="DOCTOR")
    headers = {"Authorization": f"Bearer {doctor_token}"}
    notifs = await client.get("/api/v1/notifications/me", headers=headers)
    notification_id = notifs.json()[0]["notification_id"]

    read_resp = await client.post(f"/api/v1/notifications/{notification_id}/read", headers=headers)
    assert read_resp.status_code == 200

    notifs_after = await client.get("/api/v1/notifications/me", headers=headers)
    assert notifs_after.json()[0]["is_read"] is True


@pytest.mark.asyncio
async def test_notifications_require_authentication(client):
    assert (await client.get("/api/v1/notifications/me")).status_code == 401


@pytest.mark.asyncio
async def test_super_admin_lists_all_notifications(client, async_session):
    plan = MembershipPlan(name="Free", tier=MembershipTier.FREE, validity_days=365)
    async_session.add(plan)
    await async_session.commit()
    await async_session.refresh(plan)

    doc_user, doctor = await _setup_doctor(async_session, phone="+919000000074")
    _patient_body, patient_token = await _register_and_login(client, plan.plan_id, "+919876500082")

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    await client.post(
        "/api/v1/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={"doctor_id": str(doctor.doctor_id), "appointment_date": tomorrow, "time_slot": "10:00"},
    )

    admin = User(phone="+919000000075", password_hash=hash_password("x"), role=UserRole.SUPER_ADMIN)
    async_session.add(admin)
    await async_session.commit()
    await async_session.refresh(admin)
    admin_token = create_access_token(subject=str(admin.user_id), role="SUPER_ADMIN")

    response = await client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {admin_token}"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert {n["recipient_phone"] for n in body} == {"+919000000074", "+919876500082"}


@pytest.mark.asyncio
async def test_non_admin_cannot_list_all_notifications(client, async_session):
    doc_user, _doctor = await _setup_doctor(async_session, phone="+919000000076")
    doctor_token = create_access_token(subject=str(doc_user.user_id), role="DOCTOR")

    response = await client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {doctor_token}"})

    assert response.status_code == 403
