# Yango Tech Retail: Poll the order event feed — MCP tool

**Yango Tech Retail MCP tool:** Cursor-based order event feed (POST /b2b/v1/orders/events/query): new orders, state changes and issued receipts.

Technical name: `query_order_events`

## What task it solves

> I want to poll the order event feed.

Cursor-based order event feed (POST /b2b/v1/orders/events/query): new orders, state changes and issued receipts.

## When to use it

Use this capability when you need “Poll the order event feed” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `cursor` — **optional**. Opaque cursor from the previous response of this tool. Omit it for the first page; the feed is exhausted when a page comes back with fewer items than `limit`.

## What it returns

Returns {cursor, orders_events: [{order_id, occurred, data: {type, …}}]} where data.type is state_change (with current_state), new_order, or receipt_issued (with receipt_id).

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> Poll the order event feed in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

Omit cursor for the first call, then keep passing the returned cursor — the feed is continuous, so poll again later with the last cursor.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Cancel an order](./cancel-order.md) — `cancel_order`
- [Create an order](./create-order.md) — `create_order`
- [Get order details](./get-order.md) — `get_order`
- [Get order states (batch)](./get-orders-state.md) — `get_orders_state`

## Technical details

- **Impact:** read-only
- **Group:** Orders and receipts
- **Description source:** `query_order_events` registration in `src/tools/orders.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
