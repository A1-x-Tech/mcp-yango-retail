# Yango Tech Retail: Get order states (batch) — MCP tool

**Yango Tech Retail MCP tool:** Batch order tracking (POST /b2b/v1/orders/state).

Technical name: `get_orders_state`

## What task it solves

> I want to get order states (batch).

Batch order tracking (POST /b2b/v1/orders/state).

## When to use it

Use this capability when you need “Get order states (batch)” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `orders` — **required**. Order ids to check (client-side ids used at creation).

## What it returns

Returns {query_results: [{order_id, query_result, state?}]} — query_result reports per-order lookup success (an unknown id is reported here, not as an HTTP error).

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> Get order states (batch) in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

Known states: draft, checked_out, reserving, reserved, postpone_reserving, postponed, assembling, assembled, courier_assigned, delivering, closed, pending_cancel, canceled (the list is open-ended).

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Cancel an order](./cancel-order.md) — `cancel_order`
- [Create an order](./create-order.md) — `create_order`
- [Get order details](./get-order.md) — `get_order`
- [Get fiscal receipts](./get-receipt.md) — `get_receipt`

## Technical details

- **Impact:** read-only
- **Group:** Orders and receipts
- **Description source:** `get_orders_state` registration in `src/tools/orders.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
