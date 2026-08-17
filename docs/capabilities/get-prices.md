# Yango Tech Retail: Get prices — MCP tool

**Yango Tech Retail MCP tool:** Product prices for one or more price lists (POST /b2b/v1/prices/get).

Technical name: `get_prices`

## What task it solves

> I want to get prices.

Product prices for one or more price lists (POST /b2b/v1/prices/get).

## When to use it

Use this capability when you need “Get prices” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `pricelist_ids` — **required**. Price-list ids from query_price_lists.

## What it returns

Returns {results: [{pricelist_id, prices_data: [{product_id, price, price_per_quantity?}]}]}.

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> Get prices in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

price may arrive as a number or a string — treat it as a decimal either way.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create discounts](./create-discounts.md) — `create_discounts`
- [Query price lists](./query-price-lists.md) — `query_price_lists`
- [Set prices](./set-prices.md) — `set_prices`

## Technical details

- **Impact:** read-only
- **Group:** Prices and discounts
- **Description source:** `get_prices` registration in `src/tools/pricing.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
