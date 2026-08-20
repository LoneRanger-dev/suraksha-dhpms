import io
import uuid
from datetime import date

from qrcode import QRCode
from qrcode.constants import ERROR_CORRECT_M
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.core.config import settings
from app.models import MembershipPlan, Patient, QRCard

# ISO/IEC 7810 ID-1 (CR80) standard card size.
CARD_WIDTH = 85.60 * mm
CARD_HEIGHT = 53.98 * mm

DEEP_CYAN = (0x02 / 255, 0x84 / 255, 0xC7 / 255)
MEDICAL_SLATE = (0x0F / 255, 0x17 / 255, 0x2A / 255)
VIVID_RED = (0xEF / 255, 0x44 / 255, 0x44 / 255)
MUTED_SLATE = (0x64 / 255, 0x74 / 255, 0x8B / 255)


def _scan_url(token_uuid: uuid.UUID) -> str:
    return f"{settings.frontend_base_url}/scan/{token_uuid}"


def _build_qr_image(card: QRCard) -> io.BytesIO:
    qr = QRCode(error_correction=ERROR_CORRECT_M, box_size=6, border=2)
    qr.add_data(_scan_url(card.token_uuid))
    qr.make(fit=True)
    qr_buffer = io.BytesIO()
    qr.make_image(fill_color="#0F172A", back_color="white").save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    return qr_buffer


def _calculate_age(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def generate_health_card_pdf(
    patient: Patient,
    card: QRCard,
    plan: MembershipPlan,
    hospital_name: str = "Suraksha Super Specialty Hospital",
) -> bytes:
    """Renders a print-ready CR80 (85.60mm x 53.98mm) patient health card PDF."""
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))

    pdf.setFillColorRGB(*DEEP_CYAN)
    pdf.rect(0, CARD_HEIGHT - 10 * mm, CARD_WIDTH, 10 * mm, stroke=0, fill=1)
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(3 * mm, CARD_HEIGHT - 7 * mm, hospital_name.upper())
    pdf.setFont("Helvetica", 5.5)
    pdf.drawRightString(CARD_WIDTH - 3 * mm, CARD_HEIGHT - 7 * mm, f"{plan.tier.value} MEMBER")

    qr_img = _build_qr_image(card)
    qr_size = 22 * mm
    pdf.drawImage(
        ImageReader(qr_img),
        3 * mm,
        6 * mm,
        width=qr_size,
        height=qr_size,
        preserveAspectRatio=True,
    )

    text_x = 3 * mm + qr_size + 3 * mm
    y = CARD_HEIGHT - 14 * mm
    line_height = 5.2 * mm

    pdf.setFillColorRGB(*MEDICAL_SLATE)
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(text_x, y, patient.full_name)
    y -= line_height

    pdf.setFont("Helvetica", 5.5)
    pdf.drawString(text_x, y, f"PATIENT ID: {patient.patient_display_id}")
    y -= line_height

    age = _calculate_age(patient.dob)
    pdf.drawString(
        text_x, y, f"DOB/AGE: {patient.dob.strftime('%d/%m/%Y')} ({age} Y)  {patient.gender.value[0]}"
    )
    y -= line_height

    blood_group = patient.blood_group or "—"
    pdf.drawString(text_x, y, f"BLOOD GP: {blood_group}   VALID THRU: {card.expiry_date.strftime('%m/%Y')}")
    y -= line_height

    allergies = (patient.known_allergies or "None").strip()
    if allergies.upper() not in ("NONE", ""):
        pdf.setFillColorRGB(*VIVID_RED)
    pdf.setFont("Helvetica-Bold", 5.5)
    pdf.drawString(text_x, y, f"ALLERGIES: {allergies}")

    pdf.setFillColorRGB(*MUTED_SLATE)
    pdf.setFont("Helvetica", 4.5)
    pdf.drawString(3 * mm, 3 * mm, f"24x7 EMERGENCY: {patient.emergency_contact_phone}")
    footer_url = settings.frontend_base_url.replace("https://", "").replace("http://", "")
    pdf.drawRightString(CARD_WIDTH - 3 * mm, 3 * mm, f"{footer_url}/scan")

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
