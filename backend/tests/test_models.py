from datetime import date

import pytest

from app.models import (
    Appointment,
    Doctor,
    Department,
    Invoice,
    InvoiceItem,
    MembershipPlan,
    Patient,
    Prescription,
    PrescriptionItem,
    QRCard,
    User,
    Visit,
    AuditLog,
    Base,
)
from app.models.enums import GenderType, MembershipTier, UserRole

EXPECTED_TABLES = {
    "users",
    "membership_plans",
    "patients",
    "qr_cards",
    "departments",
    "doctors",
    "appointments",
    "visits",
    "prescriptions",
    "prescription_items",
    "invoices",
    "invoice_items",
    "audit_logs",
}


def test_all_thirteen_schema_tables_are_registered():
    assert EXPECTED_TABLES.issubset(set(Base.metadata.tables.keys()))


@pytest.mark.asyncio
async def test_user_and_patient_roundtrip(async_session):
    user = User(phone="+919876543210", password_hash="hashed", role=UserRole.PATIENT)
    async_session.add(user)
    await async_session.flush()

    patient = Patient(
        user_id=user.user_id,
        patient_display_id="SUR-2026-000001",
        full_name="Manvith M N",
        dob=date(2005, 9, 4),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500000",
    )
    async_session.add(patient)
    await async_session.commit()

    fetched = await async_session.get(Patient, patient.patient_id)
    assert fetched.full_name == "Manvith M N"
    assert fetched.user_id == user.user_id
    assert fetched.known_allergies == "None"


@pytest.mark.asyncio
async def test_membership_plan_and_qr_card_link(async_session):
    plan = MembershipPlan(name="Gold", tier=MembershipTier.GOLD, consultation_discount_pct=20)
    async_session.add(plan)
    await async_session.flush()

    user = User(phone="+919876543211", password_hash="hashed", role=UserRole.PATIENT)
    async_session.add(user)
    await async_session.flush()

    patient = Patient(
        user_id=user.user_id,
        patient_display_id="SUR-2026-000002",
        full_name="Test Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.FEMALE,
        emergency_contact_phone="+919876500001",
    )
    async_session.add(patient)
    await async_session.flush()

    card = QRCard(patient_id=patient.patient_id, plan_id=plan.plan_id, expiry_date=date(2027, 1, 1))
    async_session.add(card)
    await async_session.commit()

    fetched = await async_session.get(QRCard, card.card_id)
    assert fetched.token_uuid is not None
    assert fetched.plan_id == plan.plan_id
    assert fetched.status.value == "ACTIVE"


@pytest.mark.asyncio
async def test_clinical_chain_visit_prescription_invoice(async_session):
    department = Department(name="Cardiology")
    async_session.add(department)
    await async_session.flush()

    doc_user = User(phone="+919876543212", password_hash="hashed", role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=department.department_id,
        full_name="Dr. XYZ",
        qualification="MBBS, MD",
        specialization="Cardiology",
    )
    async_session.add(doctor)

    pat_user = User(phone="+919876543213", password_hash="hashed", role=UserRole.PATIENT)
    async_session.add(pat_user)
    await async_session.flush()

    patient = Patient(
        user_id=pat_user.user_id,
        patient_display_id="SUR-2026-000003",
        full_name="Cardiac Patient",
        dob=date(1980, 5, 20),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500002",
    )
    async_session.add(patient)
    await async_session.flush()

    appointment = Appointment(
        patient_id=patient.patient_id,
        doctor_id=doctor.doctor_id,
        appointment_date=date(2026, 8, 20),
        time_slot="10:30",
        token_number="CARDIO-A-014",
    )
    async_session.add(appointment)
    await async_session.flush()

    visit = Visit(
        appointment_id=appointment.appointment_id,
        patient_id=patient.patient_id,
        doctor_id=doctor.doctor_id,
        chief_complaint="Chest pain",
        symptoms=["Chest pain", "Shortness of breath"],
        vitals={"bp": "120/80", "pulse": 78, "temp_f": 98.6, "spo2": 98},
        diagnosis="Stable angina",
    )
    async_session.add(visit)
    await async_session.flush()

    prescription = Prescription(visit_id=visit.visit_id, patient_id=patient.patient_id, doctor_id=doctor.doctor_id)
    prescription.items.append(
        PrescriptionItem(
            medicine_name="Aspirin",
            dosage="75 mg",
            frequency="1-0-0",
            duration="30 Days",
            intake_instructions="After food",
        )
    )
    async_session.add(prescription)
    await async_session.flush()

    invoice = Invoice(patient_id=patient.patient_id, visit_id=visit.visit_id, gross_amount=500, net_amount=500)
    invoice.items.append(
        InvoiceItem(description="Consultation", category="CONSULTATION", unit_price=500, final_price=500)
    )
    async_session.add(invoice)

    log = AuditLog(
        performed_by=doc_user.user_id,
        action="CREATED_PRESCRIPTION",
        entity_affected="prescriptions",
        entity_id=prescription.prescription_id,
    )
    async_session.add(log)

    await async_session.commit()

    fetched_visit = await async_session.get(Visit, visit.visit_id)
    assert fetched_visit.symptoms == ["Chest pain", "Shortness of breath"]
    assert fetched_visit.vitals["bp"] == "120/80"

    fetched_invoice = await async_session.get(Invoice, invoice.invoice_id)
    assert len(fetched_invoice.items) == 1
    assert fetched_invoice.items[0].final_price == 500
