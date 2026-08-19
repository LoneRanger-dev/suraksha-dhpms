import pytest

from app.core.security import create_access_token, hash_password
from app.models import User
from app.models.enums import UserRole


def _admin_headers(role="SUPER_ADMIN"):
    token = create_access_token(subject="00000000-0000-0000-0000-000000000090", role=role)
    return {"Authorization": f"Bearer {token}"}


async def _seed_admin_user(async_session, role=UserRole.SUPER_ADMIN):
    user = User(
        user_id="00000000-0000-0000-0000-000000000090",
        phone="+919000000090",
        password_hash=hash_password("x"),
        role=role,
    )
    async_session.add(user)
    await async_session.commit()


@pytest.mark.asyncio
async def test_admin_creates_a_membership_plan(client, async_session):
    await _seed_admin_user(async_session)

    response = await client.post(
        "/api/v1/membership-plans",
        headers=_admin_headers(),
        json={
            "name": "Senior Care Platinum",
            "tier": "PLATINUM",
            "price": "4999.00",
            "validity_days": 365,
            "consultation_discount_pct": "25.00",
            "lab_discount_pct": "20.00",
            "pharmacy_discount_pct": "15.00",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Senior Care Platinum"
    assert body["tier"] == "PLATINUM"
    assert body["consultation_discount_pct"] == "25.00"


@pytest.mark.asyncio
async def test_non_admin_cannot_create_a_membership_plan(client, async_session):
    user = User(
        user_id="00000000-0000-0000-0000-000000000091",
        phone="+919000000091",
        password_hash=hash_password("x"),
        role=UserRole.RECEPTIONIST,
    )
    async_session.add(user)
    await async_session.commit()
    token = create_access_token(subject=str(user.user_id), role="RECEPTIONIST")

    response = await client.post(
        "/api/v1/membership-plans",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Sneaky Plan", "tier": "GOLD"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_created_plan_appears_in_public_listing(client, async_session):
    await _seed_admin_user(async_session)

    await client.post(
        "/api/v1/membership-plans",
        headers=_admin_headers(),
        json={"name": "Individual Basic", "tier": "SILVER", "price": "999.00"},
    )

    response = await client.get("/api/v1/membership-plans")
    assert response.status_code == 200
    names = [plan["name"] for plan in response.json()]
    assert "Individual Basic" in names
