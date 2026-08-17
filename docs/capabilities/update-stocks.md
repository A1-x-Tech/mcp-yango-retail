# Yango Tech Retail: Update stock quantities — MCP tool

**Yango Tech Retail MCP tool:** Writes stock quantities for one store.

Technical name: `update_stocks`

## What task it solves

> I want to update stock quantities.

Writes stock quantities for one store.

## When to use it

Use this capability when you need “Update stock quantities” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `store_id` — **required**. WMS store id from get_stores.
- `stocks` — **required**. Stock lines to write (at most 1000 per request).
- `mode` — **optional**. modify (default) — regular stock update; initialize — first-time stock load of a store.

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Yango Tech Retail

The tool changes real Yango Tech Retail data as described above. The server does not promise an automatic rollback.

## Example request

> Update stock quantities in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

mode=modify (default) POSTs /b2b/v1/stocks/update with update_mode "modify" (at most 1000 items per request); mode=initialize POSTs /b2b/v1/stocks/initialize for the first-time stock load of a store. The response body is not documented upstream (2xx = success) and is returned verbatim. Verify the result with query_stocks.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Query stock levels](./query-stocks.md) — `query_stocks`

## Technical details

- **Impact:** changes data
- **Group:** Stocks
- **Description source:** `update_stocks` registration in `src/tools/stocks.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
