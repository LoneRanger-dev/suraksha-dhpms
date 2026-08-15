import io

from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.models import Doctor, Patient, Prescription


def generate_prescription_pdf(
    patient: Patient,
    doctor: Doctor,
    prescription: Prescription,
    hospital_name: str = "Suraksha Super Specialty Hospital",
) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A5)
    width, height = A5

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(15 * mm, height - 15 * mm, hospital_name)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(15 * mm, height - 21 * mm, f"Dr. {doctor.full_name} — {doctor.specialization}")

    pdf.line(15 * mm, height - 24 * mm, width - 15 * mm, height - 24 * mm)

    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(15 * mm, height - 32 * mm, f"Patient: {patient.full_name} ({patient.patient_display_id})")

    y = height - 42 * mm
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(15 * mm, y, "Rx")
    y -= 7 * mm

    pdf.setFont("Helvetica", 9)
    for item in prescription.items:
        line = f"{item.medicine_name} — {item.dosage} — {item.frequency} — {item.duration}"
        if item.intake_instructions:
            line += f" ({item.intake_instructions})"
        pdf.drawString(18 * mm, y, line)
        y -= 6 * mm

    if prescription.instructions:
        y -= 4 * mm
        pdf.setFont("Helvetica-Oblique", 8)
        pdf.drawString(15 * mm, y, f"Notes: {prescription.instructions}")

    pdf.setFont("Helvetica", 7)
    pdf.drawString(15 * mm, 15 * mm, "Digitally generated prescription — Suraksha DHPMS")

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
