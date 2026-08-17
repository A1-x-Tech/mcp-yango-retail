# Yango Tech Retail: Create or update products — MCP tool

**Yango Tech Retail MCP tool:** Creates (or upserts) products in the catalog (POST /b2b/v1/products/create), at most 100 per request.

Technical name: `create_products`

## What task it solves

> I want to synchronize products.

Creates (or upserts) products in the catalog (POST /b2b/v1/products/create), at most 100 per request.

## When to use it

Use this capability when you need “Create or update products” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `products` — **required**. Products to create/upsert (at most 100 per request).

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Yango Tech Retail

The tool changes real Yango Tech Retail data as described above. The server does not promise an automatic rollback.

## Example request

> Create or update products in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

Each product uses the same shape query_products returns: {product_id, master_category, status, is_meta, custom_attributes}. custom_attributes must include longName ({lang: text}), shortNameLoc, markCount and markCountUnitList; extra keys are passed through. The response body is not documented upstream (2xx = success) and is returned verbatim.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [List stores](./get-stores.md) — `get_stores`
- [Query the product catalog](./query-products.md) — `query_products`

## Technical details

- **Impact:** changes data
- **Group:** Catalog
- **Description source:** `create_products` registration in `src/tools/catalog.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
