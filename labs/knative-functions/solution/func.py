# A Knative Function that prices an order.
#
# In:  a CloudEvent of type dev.functionspace.order.created with data
#      {"order": "...", "sku": "...", "qty": N}
# Out: a CloudEvent of type dev.functionspace.order.priced with the total.
import logging
import os

from cloudevents.core.v1.event import CloudEvent

PRICES = {"fs-001": 1250, "fs-002": 499}  # pence


def new():
    return Function()


class Function:
    def start(self, cfg):
        # Called once per instance — at startup, or on scale-up. Put
        # expensive setup (clients, models, lookups) here, not in handle().
        self.who = cfg.get("PREFIX", "unknown")
        logging.info("pricing function starting for %s", self.who)

    async def handle(self, scope, receive, send):
        request = scope["event"]
        data = request.get_data()
        qty = data.get("qty", 1) if isinstance(data, dict) else None
        if not isinstance(data, dict) or not data.get("sku") or not isinstance(qty, int) or qty < 1:
            # A bad order will be bad on every retry. Say so with a 400, which
            # brokers treat as permanent: no retries, straight to the dead-letter
            # sink (K2.L4). Do not raise ValueError for this — in func-python
            # 0.8.1 that surfaces as a 500, which IS retried (K3.L3).
            await send.structured(
                CloudEvent(
                    attributes={
                        "type": "dev.functionspace.order.rejected",
                        "source": f"/functions/{self.who}-fn",
                        "datacontenttype": "application/json",
                    },
                    data={"error": "need a dict with a sku and a positive integer qty", "got": data},
                ),
                400,
            )
            return
        sku = data["sku"]
        unit = PRICES.get(sku)
        logging.info("pricing %s x%d (event %s)", sku, qty, request.get_id())

        response = CloudEvent(
            attributes={
                "type": "dev.functionspace.order.priced",
                "source": f"/functions/{self.who}-fn",
                "id": f"priced-{request.get_id()}",
                # Say what the data is. Without this the SDK labels the reply
                # text/plain, and every consumer has to guess (K2.L6).
                "datacontenttype": "application/json",
            },
            data={
                "order": data.get("order"),
                "sku": sku,
                "qty": qty,
                "known_sku": unit is not None,
                "total_pence": (unit or 0) * qty,
                "priced_by": os.environ.get("K_REVISION", "local"),
            },
        )
        await send(response)

    def stop(self):
        logging.info("pricing function stopping")

    def alive(self):
        return True, "Alive"

    def ready(self):
        return True, "Ready"
