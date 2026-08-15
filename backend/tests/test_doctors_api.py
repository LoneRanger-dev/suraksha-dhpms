import pytest

from app.core.security import hash_password
from app.models import Department, Doctor, User
from app.models.enums import UserRole


@pytest.mark.asyncio
async def test_lists_doctors_with_department_name(client, async_session):
    dept = Department(name="Cardiology")
    async_session.add(dept)
    await async_session.flush()

    doc_user = User(phone="+919000000040", password_hash=hash_password("x"), role=UserRole.DOCTOR)
    async_session.add(doc_user)
    await async_session.flush()

    doctor = Doctor(
        user_id=doc_user.user_id,
        department_id=dept.department_id,
        full_name="Dr. Listable",
        qualification="MBBS",
        specialization="Cardiology",
    )
    async_session.add(doctor)
    await async_session.commit()

    response = await client.get("/api/v1/doctors")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["full_name"] == "Dr. Listable"
    assert body[0]["department_name"] == "Cardiology"
