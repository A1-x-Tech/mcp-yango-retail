# Yango Tech Retail: Get fiscal receipts — MCP tool

**Yango Tech Retail MCP tool:** Fiscal receipt(s) by receipt id OR order id (POST /b2b/v1/receipts/get) — pass exactly one of the two.

Technical name: `get_receipt`

## What task it solves

> I want to get fiscal receipts.

Fiscal receipt(s) by receipt id OR order id (POST /b2b/v1/receipts/get) — pass exactly one of the two.

## When to use it

Use this capability when you need “Get fiscal receipts” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `receipt_id` — **optional**. Receipt id (e.g. from a receipt_issued order event). Mutually exclusive with order_id.
- `order_id` — **optional**. Order id to fetch receipts for. Mutually exclusive with receipt_id.
- `client_fields` — **optional**. Which client PII fields to include in the response (omitted = no PII).

## What it returns

Returns {receipts: [{receipt_id, order, create_time, store, receipt_type (payment|refund), payment_methods, items, client?}]}; items is a map keyed by item id, and all amounts are decimal strings.

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> Get fiscal receipts in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

Client PII (full_name, phone_number, email, delivery_address) is included only for the fields you list in client_fields.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Cancel an order](./cancel-order.md) — `cancel_order`
- [Create an order](./create-order.md) — `create_order`
- [Get order details](./get-order.md) — `get_order`
- [Get order states (batch)](./get-orders-state.md) — `get_orders_state`

## Technical details

- **Impact:** read-only
- **Group:** Orders and receipts
- **Description source:** `get_receipt` registration in `src/tools/orders.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
