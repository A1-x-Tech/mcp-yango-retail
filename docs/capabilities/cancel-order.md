# Yango Tech Retail: Cancel an order — MCP tool

**Yango Tech Retail MCP tool:** Cancels an existing order (POST /b2b/v1/orders/cancel).

Technical name: `cancel_order`

## What task it solves

> I want to cancel an order.

Cancels an existing order (POST /b2b/v1/orders/cancel).

## When to use it

Use this capability when you need “Cancel an order” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `order_id` — **required**. The order id (the client-side id the order was created with).
- `reason` — **optional**. Free-form cancellation reason.

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Yango Tech Retail

The source marks the entire “Cancel an order” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Cancel an order in Yango Tech Retail. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

Optionally pass a reason. The response body is not documented upstream and is returned verbatim; verify the outcome with get_orders_state (expect canceled or pending_cancel).

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create an order](./create-order.md) — `create_order`
- [Get order details](./get-order.md) — `get_order`
- [Get order states (batch)](./get-orders-state.md) — `get_orders_state`
- [Get fiscal receipts](./get-receipt.md) — `get_receipt`

## Technical details

- **Impact:** destructive operation
- **Group:** Orders and receipts
- **Description source:** `cancel_order` registration in `src/tools/orders.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
