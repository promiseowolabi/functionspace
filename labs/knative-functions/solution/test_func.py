import pytest
from cloudevents.core.v1.event import CloudEvent
from function import new


class FakeSend:
    """Stands in for func-python's CloudEventSender: callable, plus .structured()."""

    def __init__(self):
        self.sent, self.statuses = [], []

    async def __call__(self, event, status=200):
        self.sent.append(event)
        self.statuses.append(status)

    async def structured(self, event, status=200):
        await self(event, status)


@pytest.mark.asyncio
async def test_prices_a_known_sku():
    f = new()
    f.start({"PREFIX": "test"})
    event = CloudEvent(
        attributes={"id": "o-1", "type": "dev.functionspace.order.created", "source": "/test"},
        data={"order": "o-1", "sku": "fs-001", "qty": 3},
    )
    send = FakeSend()
    await f.handle({"event": event}, None, send)
    sent = send.sent
    assert len(sent) == 1
    reply = sent[0]
    assert reply.get_type() == "dev.functionspace.order.priced"
    assert reply.get_data()["total_pence"] == 3750
    assert reply.get_data()["known_sku"] is True


@pytest.mark.asyncio
async def test_rejects_a_bad_quantity_with_400():
    f = new()
    f.start({"PREFIX": "test"})
    event = CloudEvent(
        attributes={"id": "o-2", "type": "dev.functionspace.order.created", "source": "/test"},
        data={"order": "o-2", "sku": "fs-001", "qty": "abc"},
    )
    send = FakeSend()
    await f.handle({"event": event}, None, send)
    assert send.statuses == [400]
    assert send.sent[0].get_type() == "dev.functionspace.order.rejected"
