# Yango Tech Retail: Get order details — MCP tool

**Yango Tech Retail MCP tool:** Details of a single order (POST /b2b/v1/orders/get): every field the order was created with (cart, delivery_address, payment_type, store_id, …) plus create_time.

Technical name: `get_order`

## What task it solves

> I want to get order details.

Details of a single order (POST /b2b/v1/orders/get): every field the order was created with (cart, delivery_address, payment_type, store_id, …) plus create_time.

## When to use it

Use this capability when you need “Get order details” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `order_id` — **required**. The order id (the client-side id the order was created with).

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> Get order details in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

NOTE: the response does NOT include the order state — use get_orders_state for tracking.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Cancel an order](./cancel-order.md) — `cancel_order`
- [Create an order](./create-order.md) — `create_order`
- [Get order states (batch)](./get-orders-state.md) — `get_orders_state`
- [Get fiscal receipts](./get-receipt.md) — `get_receipt`

## Technical details

- **Impact:** read-only
- **Group:** Orders and receipts
- **Description source:** `get_order` registration in `src/tools/orders.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
