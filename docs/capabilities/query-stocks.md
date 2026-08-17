# Yango Tech Retail: Query stock levels — MCP tool

**Yango Tech Retail MCP tool:** Cursor-based stock feed across stores (POST /b2b/v1/stocks/query).

Technical name: `query_stocks`

## What task it solves

> I want to query stock levels.

Cursor-based stock feed across stores (POST /b2b/v1/stocks/query).

## When to use it

Use this capability when you need “Query stock levels” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `cursor` — **optional**. Opaque cursor from the previous response of this tool. Omit it for the first page; the feed is exhausted when a page comes back with fewer items than `limit`.
- `limit` — **optional**. Page size (default 100 — the official client's value; the server-side maximum is undocumented).

## What it returns

Returns {stocks: [{product_id, quantity, shelf_type, store_id}], cursor}; iterate until a page has fewer items than limit for a full snapshot.

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> Query stock levels in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

Known shelf_type values (open-ended): store, markdown, incoming, out, trash, lost, found, office, parcel, parcel_returned, collection, cargo, repacking, review, kitchen_on_demand, kitchen_components, kitchen_trash, kitchen_lost, kitchen_found. Sellable stock normally lives on shelf_type "store".

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Update stock quantities](./update-stocks.md) — `update_stocks`

## Technical details

- **Impact:** read-only
- **Group:** Stocks
- **Description source:** `query_stocks` registration in `src/tools/stocks.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
