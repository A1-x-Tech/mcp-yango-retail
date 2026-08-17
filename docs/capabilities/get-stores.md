# Yango Tech Retail: List stores — MCP tool

**Yango Tech Retail MCP tool:** All stores (darkstores) of the retailer (POST /b2b/v1/stores/get, no parameters).

Technical name: `get_stores`

## What task it solves

> I want to list stores.

All stores (darkstores) of the retailer (POST /b2b/v1/stores/get, no parameters).

## When to use it

Use this capability when you need “List stores” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

No parameters are required.

## What it returns

Returns {stores: [{id, status, location: {lat, lon}, address?, name?}]}.

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> List stores in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

The store id is the WMS store id used by create_order, update_stocks and create_discounts; status values are not enumerated upstream.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create or update products](./create-products.md) — `create_products`
- [Query the product catalog](./query-products.md) — `query_products`

## Technical details

- **Impact:** read-only
- **Group:** Catalog
- **Description source:** `get_stores` registration in `src/tools/catalog.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
