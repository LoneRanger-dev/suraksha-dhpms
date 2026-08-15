import pytest

from app.models import MembershipPlan
from app.models.enums import MembershipTier


@pytest.mark.asyncio
async def test_download_qr_card_pdf(client, async_session):
    plan = MembershipPlan(name="Gold", tier=MembershipTier.GOLD, validity_days=365)
    async_session.add(plan)
    await async_session.commit()

    create_resp = await client.post(
        "/api/v1/patients",
        json={
            "full_name": "Card Download Patient",
            "dob": "1990-01-01",
            "gender": "MALE",
            "phone": "+919876500008",
            "password": "Patient@123",
            "emergency_contact_phone": "+919876500009",
            "plan_id": str(plan.plan_id),
        },
    )
    card_id = create_resp.json()["qr_card"]["card_id"]

    pdf_resp = await client.get(f"/api/v1/qrcards/{card_id}/card.pdf")

    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_download_unknown_qr_card_returns_404(client):
    import uuid

    response = await client.get(f"/api/v1/qrcards/{uuid.uuid4()}/card.pdf")
    assert response.status_code == 404
