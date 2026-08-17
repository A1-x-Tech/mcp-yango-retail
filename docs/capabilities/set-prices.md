# Yango Tech Retail: Set prices — MCP tool

**Yango Tech Retail MCP tool:** Sets product prices in price lists (POST /b2b/v1/prices/set), at most 100 per request.

Technical name: `set_prices`

## What task it solves

> I want to set prices.

Sets product prices in price lists (POST /b2b/v1/prices/set), at most 100 per request.

## When to use it

Use this capability when you need “Set prices” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `prices` — **required**. Price assignments (at most 100 per request).

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Yango Tech Retail

The tool changes real Yango Tech Retail data as described above. The server does not promise an automatic rollback.

## Example request

> Set prices in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

Prices are decimal STRINGS (e.g. "150.00"); price_per_quantity (pack size the price applies to) defaults to 1 when omitted. The response body is not documented upstream (2xx = success) and is returned verbatim. There is no delete endpoint for prices.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create discounts](./create-discounts.md) — `create_discounts`
- [Get prices](./get-prices.md) — `get_prices`
- [Query price lists](./query-price-lists.md) — `query_price_lists`

## Technical details

- **Impact:** changes data
- **Group:** Prices and discounts
- **Description source:** `set_prices` registration in `src/tools/pricing.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
