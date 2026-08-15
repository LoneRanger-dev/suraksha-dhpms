import uuid
from datetime import date

from app.models import Doctor, Patient, Prescription, PrescriptionItem
from app.models.enums import GenderType
from app.services.prescription_pdf_service import generate_prescription_pdf


def test_generates_valid_prescription_pdf():
    patient = Patient(
        patient_display_id="SUR-2026-000999",
        full_name="Rx Patient",
        dob=date(1990, 1, 1),
        gender=GenderType.MALE,
        emergency_contact_phone="+919876500094",
    )
    doctor = Doctor(
        user_id=uuid.uuid4(),
        department_id=uuid.uuid4(),
        full_name="Dr. Rx",
        qualification="MBBS",
        specialization="General Medicine",
    )
    prescription = Prescription(
        visit_id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        doctor_id=uuid.uuid4(),
        instructions="Drink plenty of fluids",
    )
    prescription.items.append(
        PrescriptionItem(
            medicine_name="Paracetamol",
            dosage="500 mg",
            frequency="1-0-1",
            duration="3 Days",
            intake_instructions="After food",
        )
    )

    pdf_bytes = generate_prescription_pdf(patient, doctor, prescription)

    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 500
