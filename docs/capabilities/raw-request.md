# Yango Tech Retail: Raw Yango Tech Retail API call — MCP tool

**Yango Tech Retail MCP tool:** Escape hatch: direct call to any Yango Tech Retail B2B endpoint — for paths without a dedicated tool (orders/update, receipts/documents/upload, wms/picking/set-state, logistics/delivery/set-state, products-vat/*, pricelists/get|create, store-pricelist-links/*, 3pl/deliveries/*).

Technical name: `raw_request`

## What task it solves

> I want to raw Yango Tech Retail API call.

Escape hatch: direct call to any Yango Tech Retail B2B endpoint — for paths without a dedicated tool (orders/update, receipts/documents/upload, wms/picking/set-state, logistics/delivery/set-state, products-vat/*, pricelists/get|create, store-pricelist-links/*, 3pl/deliveries/*).

## When to use it

Use this capability when you need “Raw Yango Tech Retail API call” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `path` — **required**. Relative API path, e.g. "b2b/v1/pricelists/get". Absolute URLs are rejected (SSRF guard).
- `body` — **optional**. JSON request body (defaults to {} — the API expects a JSON object on every call).

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Yango Tech Retail

The source marks the entire “Raw Yango Tech Retail API call” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Raw Yango Tech Retail API call in Yango Tech Retail. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

Every endpoint of this API is a POST with a JSON body; pass a relative path like "b2b/v1/pricelists/get" and the body object. CAUTION: this tool can perform writes; 5xx/network errors are never retried for it.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

There are no other dedicated tools in this group.

## Technical details

- **Impact:** destructive operation
- **Group:** Additional API methods
- **Description source:** `raw_request` registration in `src/tools/raw.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
