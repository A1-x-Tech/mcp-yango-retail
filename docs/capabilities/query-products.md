# Yango Tech Retail: Query the product catalog — MCP tool

**Yango Tech Retail MCP tool:** Cursor-based product catalog / product-updates feed (POST /b2b/v1/products/query).

Technical name: `query_products`

## What task it solves

> I want to query the product catalog.

Cursor-based product catalog / product-updates feed (POST /b2b/v1/products/query).

## When to use it

Use this capability when you need “Query the product catalog” without doing the same work manually in the Yango Tech Retail interface. It runs only when an AI client calls it.

## What to provide

- `cursor` — **optional**. Opaque cursor from the previous response of this tool. Omit it for the first page; the feed is exhausted when a page comes back with fewer items than `limit`.
- `limit` — **optional**. Page size (default 300 — the official client's value; the server-side maximum is undocumented).

## What it returns

Returns {products, cursor}; iterate until a page has fewer items than limit to build a full snapshot.

## What changes in Yango Tech Retail

The tool reads Yango Tech Retail data and does not change it.

## Example request

> Query the product catalog in Yango Tech Retail. Ask for any required identifiers that are missing.

## Errors and limitations

Each product: {product_id, master_category, status (active|disabled|archived), is_meta, custom_attributes}. custom_attributes carries localized maps (longName, shortNameLoc, descriptionLoc: {lang: text}), markCount + markCountUnitList (unit/gram/kilogram/liter/millilitre — open-ended), barcode[], images[], typeAccounting (byUnit|byWeight|byTrueWeight) and arbitrary extra attributes.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create or update products](./create-products.md) — `create_products`
- [List stores](./get-stores.md) — `get_stores`

## Technical details

- **Impact:** read-only
- **Group:** Catalog
- **Description source:** `query_products` registration in `src/tools/catalog.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
