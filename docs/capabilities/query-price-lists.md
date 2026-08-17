# Yango Tech Retail: Query price lists — MCP tool

**Yango Tech Retail MCP tool:** Cursor-based price-list feed (POST /b2b/v1/pricelists/query) — the API's only way to list price lists, so a full snapshot means iterating until a page has fewer items than limit.

Technical name: `query_price_lists`

## What task it solves

> I want to query price lists.

Cursor-based price-list feed (POST /b2b/v1/pricelists/query) — the API's only way to list price lists, so a full snapshot means iterating until a page has fewer items than limit.

## When to use it

Use this capability when you need “Query price lists” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `cursor` — **optional**. Opaque cursor from the previous response of this tool. Omit it for the first page; the feed is exhausted when a page comes back with fewer items than `limit`.
- `limit` — **optional**. Page size (default 100 — the official client's value; the server-side maximum is undocumented).

## What it returns

Returns {pricelists: [{id, name, status (active|removed)}], cursor}.

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> Query price lists in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

Price-list ids feed get_prices and set_prices. Related endpoints without a dedicated tool (pricelists/get, pricelists/create, store-pricelist-links/*) are reachable via raw_request.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create discounts](./create-discounts.md) — `create_discounts`
- [Get prices](./get-prices.md) — `get_prices`
- [Set prices](./set-prices.md) — `set_prices`

## Technical details

- **Impact:** read-only
- **Group:** Prices and discounts
- **Description source:** `query_price_lists` registration in `src/tools/pricing.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
