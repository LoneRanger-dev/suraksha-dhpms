import pytest

from app.models import MembershipPlan
from app.models.enums import MembershipTier


@pytest.mark.asyncio
async def test_lists_active_membership_plans(client, async_session):
    active = MembershipPlan(name="Gold", tier=MembershipTier.GOLD, is_active=True)
    inactive = MembershipPlan(name="Retired Plan", tier=MembershipTier.SILVER, is_active=False)
    async_session.add_all([active, inactive])
    await async_session.commit()

    response = await client.get("/api/v1/membership-plans")

    assert response.status_code == 200
    names = [plan["name"] for plan in response.json()]
    assert "Gold" in names
    assert "Retired Plan" not in names
