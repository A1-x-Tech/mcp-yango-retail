# Tools

For task-oriented guidance, open the [MCP capability catalog](./capabilities/index.md). This page remains the technical reference for schemas and API responses.

Yango Tech Retail is a **write API**: some tools below create orders, overwrite prices and
stock levels. Every endpoint lives under `/b2b/v1/*` on `api.retailtech.yango.com` and is a
**POST with a JSON body — including reads**. Tool inputs match the wire format (snake_case,
same values); the client owns the host, the Bearer auth header, the page-size defaults and
the stocks `update_mode` mapping. Responses pass through verbatim.

There is no public first-party docs portal: the official Python client
([yango-tech/yango-tech-grocery-client](https://github.com/yango-tech/yango-tech-grocery-client))
is the de-facto spec, and its untyped areas are called out below.

## Orders and receipts

| Tool | Description |
|---|---|
| `create_order` | Creates an order (`orders/create`). You pick the `order_id`; money fields are decimal **strings** (`"150.00"`). Cart, delivery address (`{lat, lon}` + structured address), payment type (open-ended: `cash`, `online`, `card`, `apple_pay`, `loyalty`), store id, delivery slot. Response is undocumented upstream — returned verbatim. |
| `cancel_order` | Cancels an order (`orders/cancel`), optional free-form `reason`. Verify via `get_orders_state`. |
| `get_order` | Order details (`orders/get`): all creation fields + `create_time`. **Does NOT return the order state** — that lives only in `get_orders_state`. |
| `get_orders_state` | Batch tracking (`orders/state`): `{query_results: [{order_id, query_result, state?}]}`. Unknown ids are reported per-item in `query_result`, not as HTTP errors. Known states: `draft, checked_out, reserving, reserved, postpone_reserving, postponed, assembling, assembled, courier_assigned, delivering, closed, pending_cancel, canceled` (open-ended). |
| `query_order_events` | Continuous cursor feed (`orders/events/query`): `data.type` is `state_change` (with `current_state`), `new_order`, or `receipt_issued` (with `receipt_id`). Keep the last cursor and poll again later. |
| `get_receipt` | Fiscal receipts (`receipts/get`) by **exactly one** of `receipt_id` / `order_id`. Client PII arrives only for the fields listed in `client_fields` (`full_name`, `phone_number`, `email`, `delivery_address`). All amounts are decimal strings. |

## Catalog

| Tool | Description |
|---|---|
| `get_stores` | All darkstores (`stores/get`, empty body): `{stores: [{id, status, location {lat, lon}, address?, name?}]}`. Store `status` values are not enumerated upstream. |
| `query_products` | Cursor feed (`products/query`, default limit 300): `{products, cursor}`. Product: `{product_id, master_category, status (active\|disabled\|archived), is_meta, custom_attributes}`; `custom_attributes` holds localized name maps, `markCount` + `markCountUnitList` (open-ended units), `barcode[]`, `typeAccounting` and arbitrary extra keys. |
| `create_products` | Upserts ≤100 products per request (`products/create`) in the same shape `query_products` returns. 2xx = success; the response body is undocumented. |

## Pricing

| Tool | Description |
|---|---|
| `query_price_lists` | Cursor feed (`pricelists/query`, default limit 100): `{pricelists: [{id, name, status (active\|removed)}], cursor}` — the API's only way to list price lists. |
| `get_prices` | Prices for price lists (`prices/get`): `{results: [{pricelist_id, prices_data: [{product_id, price, price_per_quantity?}]}]}`. `price` may be a number **or** a string. |
| `set_prices` | Sets ≤100 prices per request (`prices/set`). Prices are decimal strings; `price_per_quantity` defaults to 1 on the wire. |
| `create_discounts` | Creates ≤100 per-store discounts (`discounts/create`). ⚠️ The key names inside `discount_activity_period` and `discount_value` are **undocumented** (plain string→string maps upstream) — confirm with Yango Tech first. There is no endpoint to list or delete discounts. |

## Stocks

| Tool | Description |
|---|---|
| `query_stocks` | Cursor feed (`stocks/query`, default limit 100): `{stocks: [{product_id, quantity, shelf_type, store_id}], cursor}`. `shelf_type` is open-ended (`store`, `markdown`, `incoming`, `trash`, `kitchen_*`, …); sellable stock is normally on `store`. |
| `update_stocks` | Writes quantities for one store. `mode=modify` (default) → `stocks/update` with `update_mode: "modify"`, ≤1000 lines; `mode=initialize` → `stocks/initialize` for a store's first stock load. |

Notes:

- **Money is decimal strings** (`"150.00"`) everywhere a tool sends it; `get_prices` may
  return numbers — treat both as decimals.
- **Pagination** is cursor-based with no `has_more` flag: a page with fewer items than
  `limit` means the feed is (currently) exhausted. Event feeds are continuous — keep the
  cursor and poll later. Cursor TTL and server-side limit maximums are undocumented.
- **Partial failures** on some reads arrive per item (`query_result`, `get_result`), not as
  HTTP errors — always check the items.
- **Retries:** 429 is always retried with backoff (honoring `Retry-After`); 5xx and network
  errors are retried only for reads. Writes are never replayed automatically. The official
  client throttles itself to 5 RPS per (token, endpoint) — a sensible budget here too.
- **Errors** surface the HTTP status, the raw body (the error schema is undocumented) and
  the `x-yatraceid` / `x-yarequestid` headers — quote them when contacting Yango Tech support.

## Escape hatch

| Tool | Description |
|---|---|
| `raw_request` | Direct POST to any `/b2b/v1/*` path without a dedicated tool: `orders/update`, `receipts/documents/upload`, `wms/picking/set-state`, `logistics/delivery/set-state`, `products-vat/get\|create\|update`, `products/media/create` (note: actually multipart upstream), `pricelists/get\|create`, `store-pricelist-links/get\|create`, `3pl/deliveries/*`. A path that resolves to a foreign origin is rejected (SSRF guard), so the Bearer token cannot leak. Writes through this tool are never retried on 5xx. |

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `YANGO_RETAIL_TOKEN` | yes | — | Bearer token issued by Yango Tech (`YANGO_AUTH_TOKEN` accepted as an alias — the official Python client's name). Treat it as a secret. |
| `YANGO_RETAIL_API_BASE_URL` | no | `https://api.retailtech.yango.com` | API root override (`YANGO_API_BASE_URL` and `YANGO_DOMAIN` — the official Python client's name — accepted as aliases). |
| `YANGO_RETAIL_TIMEOUT_MS` | no | `60000` | Per-request timeout, ms. |
| `YANGO_RETAIL_MAX_RETRIES` | no | `3` | Retries on transient errors (429 always; 5xx/network for reads only). |
