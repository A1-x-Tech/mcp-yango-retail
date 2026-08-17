# Yango Tech Retail MCP capabilities

This catalog contains 16 public pages—one for every registered MCP tool in `mcp-yango-retail`. Each page starts with the user's task, explains the result, and states whether the call changes real data.

Use this catalog to choose a ready-made capability. Full parameter schemas and API response details remain in the [technical reference](../TOOLS.md).

## Orders and receipts

- [Cancel an order](./cancel-order.md) — Cancels an existing order (POST /b2b/v1/orders/cancel). **Impact:** destructive operation.
- [Create an order](./create-order.md) — Creates an order on the Yango Tech platform (POST /b2b/v1/orders/create). **Impact:** changes data.
- [Get order details](./get-order.md) — Details of a single order (POST /b2b/v1/orders/get): every field the order was created with (cart, delivery_address, payment_type, store_id, …) plus create_time. **Impact:** read-only.
- [Get order states (batch)](./get-orders-state.md) — Batch order tracking (POST /b2b/v1/orders/state). **Impact:** read-only.
- [Get fiscal receipts](./get-receipt.md) — Fiscal receipt(s) by receipt id OR order id (POST /b2b/v1/receipts/get) — pass exactly one of the two. **Impact:** read-only.
- [Poll the order event feed](./query-order-events.md) — Cursor-based order event feed (POST /b2b/v1/orders/events/query): new orders, state changes and issued receipts. **Impact:** read-only.

## Prices and discounts

- [Create discounts](./create-discounts.md) — Creates per-store product discounts (POST /b2b/v1/discounts/create), at most 100 per request. **Impact:** changes data.
- [Get prices](./get-prices.md) — Product prices for one or more price lists (POST /b2b/v1/prices/get). **Impact:** read-only.
- [Query price lists](./query-price-lists.md) — Cursor-based price-list feed (POST /b2b/v1/pricelists/query) — the API's only way to list price lists, so a full snapshot means iterating until a page has fewer items than limit. **Impact:** read-only.
- [Set prices](./set-prices.md) — Sets product prices in price lists (POST /b2b/v1/prices/set), at most 100 per request. **Impact:** changes data.

## Catalog

- [Create or update products](./create-products.md) — Creates (or upserts) products in the catalog (POST /b2b/v1/products/create), at most 100 per request. **Impact:** changes data.
- [List stores](./get-stores.md) — All stores (darkstores) of the retailer (POST /b2b/v1/stores/get, no parameters). **Impact:** read-only.
- [Query the product catalog](./query-products.md) — Cursor-based product catalog / product-updates feed (POST /b2b/v1/products/query). **Impact:** read-only.

## Stocks

- [Query stock levels](./query-stocks.md) — Cursor-based stock feed across stores (POST /b2b/v1/stocks/query). **Impact:** read-only.
- [Update stock quantities](./update-stocks.md) — Writes stock quantities for one store. **Impact:** changes data.

## Additional API methods

- [Raw Yango Tech Retail API call](./raw-request.md) — Escape hatch: direct call to any Yango Tech Retail B2B endpoint — for paths without a dedicated tool (orders/update, receipts/documents/upload, wms/picking/set-state, logistics/delivery/set-state, products-vat/*, pricelists/get|create, store-pricelist-links/*, 3pl/deliveries/*). **Impact:** destructive operation.

## For maintainers and publishers

- [MCP capability documentation contract](../CAPABILITY-DOCUMENTATION.md)
- [Technical tool reference](../TOOLS.md)
- [GitHub repository](https://github.com/A1-x-Tech/mcp-yango-retail)
