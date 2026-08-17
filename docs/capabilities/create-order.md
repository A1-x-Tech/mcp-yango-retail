# Yango Tech Retail: Create an order — MCP tool

**Yango Tech Retail MCP tool:** Creates an order on the Yango Tech platform (POST /b2b/v1/orders/create).

Technical name: `create_order`

## What task it solves

> I want to create an order.

Creates an order on the Yango Tech platform (POST /b2b/v1/orders/create).

## When to use it

Use this capability when you need “Create an order” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `order_id` — **required**. Client-side order id (you choose it; reuse it in the other order tools).
- `cart` — **optional**. Shopping cart: items plus totals (all money as decimal strings).
- `client_phone_number` — **optional**. Customer phone number in international format.
- `courier_pin` — **optional**. PIN the courier must present on handover.
- `delivery_address` — **optional**. Delivery address: coordinates plus optional structured address and comment.
- `payment_type` — **optional**. Payment type. Known values: cash, online, card, apple_pay, loyalty (the list is open-ended).
- `store_id` — **optional**. WMS store (darkstore) id from get_stores.
- `use_external_logistics` — **optional**. true — delivery is handled by external (3PL) logistics instead of the platform.
- `delivery_properties` — **optional**. Delivery properties: type and optional {start, end} slot.
- `human_order_id` — **optional**. Human-readable order number shown to the customer.

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Yango Tech Retail

The tool changes real Yango Tech Retail data as described above. The server does not promise an automatic rollback.

## Example request

> Create an order in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

You supply the order_id; the same body shape is used by the platform for order updates. All money fields are decimal STRINGS (e.g. "150.00"), never numbers. The response body is not documented upstream and is returned verbatim. After creation, track progress with get_orders_state (get_order does NOT return the state).

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Cancel an order](./cancel-order.md) — `cancel_order`
- [Get order details](./get-order.md) — `get_order`
- [Get order states (batch)](./get-orders-state.md) — `get_orders_state`
- [Get fiscal receipts](./get-receipt.md) — `get_receipt`

## Technical details

- **Impact:** changes data
- **Group:** Orders and receipts
- **Description source:** `create_order` registration in `src/tools/orders.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
