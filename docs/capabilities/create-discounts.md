# Yango Tech Retail: Create discounts — MCP tool

**Yango Tech Retail MCP tool:** Creates per-store product discounts (POST /b2b/v1/discounts/create), at most 100 per request.

Technical name: `create_discounts`

## What task it solves

> I want to create discounts.

Creates per-store product discounts (POST /b2b/v1/discounts/create), at most 100 per request.

## When to use it

Use this capability when you need “Create discounts” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `discounts` — **required**. Discounts to create (at most 100 per request).

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Yango Tech Retail

The tool changes real Yango Tech Retail data as described above. The server does not promise an automatic rollback.

## Example request

> Create discounts in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

CAUTION: the exact key names inside discount_activity_period and discount_value are NOT documented (the official client types them as plain string→string maps with no example) — confirm the expected keys with Yango Tech before relying on this tool, and note there is no endpoint to list or delete discounts. The response body is not documented upstream (2xx = success) and is returned verbatim.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Get prices](./get-prices.md) — `get_prices`
- [Query price lists](./query-price-lists.md) — `query_price_lists`
- [Set prices](./set-prices.md) — `set_prices`

## Technical details

- **Impact:** changes data
- **Group:** Prices and discounts
- **Description source:** `create_discounts` registration in `src/tools/pricing.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
