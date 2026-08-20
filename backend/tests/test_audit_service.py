import uuid

import pytest
from sqlalchemy import select

from app.models import AuditLog
from app.services.audit_service import record_audit


@pytest.mark.asyncio
async def test_record_audit_creates_log_entry(async_session):
    user_id = uuid.uuid4()
    entity_id = uuid.uuid4()

    await record_audit(
        async_session,
        performed_by=user_id,
        action="CREATE",
        entity_affected="patient",
        entity_id=entity_id,
        ip_address="127.0.0.1",
    )

    result = await async_session.execute(select(AuditLog))
    logs = result.scalars().all()

    assert len(logs) == 1
    assert logs[0].performed_by == user_id
    assert logs[0].action == "CREATE"
    assert logs[0].entity_affected == "patient"
    assert logs[0].entity_id == entity_id
    assert logs[0].ip_address == "127.0.0.1"
    assert logs[0].timestamp is not None


@pytest.mark.asyncio
async def test_record_audit_allows_null_performer(async_session):
    entity_id = uuid.uuid4()

    await record_audit(
        async_session,
        performed_by=None,
        action="READ",
        entity_affected="patient",
        entity_id=entity_id,
    )

    result = await async_session.execute(select(AuditLog))
    logs = result.scalars().all()

    assert len(logs) == 1
    assert logs[0].performed_by is None
    assert logs[0].ip_address is None
