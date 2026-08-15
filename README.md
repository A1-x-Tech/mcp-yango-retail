# <img src="./assets/a1-logo.svg" alt="A1" width="40"> Yango Tech Retail MCP

[![npm](https://img.shields.io/npm/v/mcp-yango-retail)](https://www.npmjs.com/package/mcp-yango-retail)
[![CI](https://github.com/A1-x-Tech/mcp-yango-retail/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-yango-retail/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-yango-retail/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-yango-retail)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Yango Tech Retail MCP lets a retail team work with stores, orders, products, prices, discounts and stock through an AI assistant. It connects to the retailer-facing Yango Tech B2B API and turns routine catalog and order operations into a conversation in Claude, Cursor, Codex or another MCP client.

- **One view of the operation.** List stores, inspect orders and receipts, browse the product catalog and check stock across darkstores.
- **Controlled writes.** Create or cancel orders, update prices and stocks, and create discounts with explicit tool boundaries.
- **Large catalog workflows.** Follow pagination and send products, prices, discounts and stock updates in the supported batches.
- **Useful API coverage.** `raw_request` reaches documented endpoints without a dedicated tool and is guarded against foreign paths.
- **Safe retries.** Temporary 429 responses are retried; writes are not replayed after an uncertain failure.

[Connect the server](#quick-start) · [Explore use cases](#what-you-can-ask-it-to-do) · [Open technical documentation](#technical-documentation)

## See it work in a minute

> **You:** List our stores and show the current stock of product `4607034171438` in each.
>
> **Assistant:** I found the darkstores and returned the stock for this product by store. No data was changed.
>
> **You:** Set the price of product `123` to 99.90 in the default price list.
>
> **Assistant:** I will update one price and then read it back to confirm the result. This is a real change in the retailer account.
>
> **You:** Create order `ORD-1042` for store `LAVKA-3`: two units of product `123` at 150.00, cash on delivery.
>
> **Assistant:** I will create the order and return its state and receipt information from the API.

> Store ids, order states, prices, stock and available operations always come from the connected Yango Tech account.

## Quick start

You need Node.js 20+ and a Yango Tech Retail Bearer token. The token is stored in the AI client's local configuration, so treat it like a password.

1. [Get a token](#getting-access) from your Yango Tech integration manager.
2. Add the server to your AI client. For Codex CLI:

   ```bash
   codex mcp add yango-retail \
     --env YANGO_RETAIL_TOKEN=your_token \
     -- npx -y mcp-yango-retail@latest
   ```

3. Start with a read-only request:

   > List our stores and show the current stock of product 4607034171438 in each.

The browser versions of ChatGPT and Claude cannot attach a local `npx`/stdio server directly. Use a desktop app, CLI or IDE integration listed below.

### Add it to other AI clients

<details open>
<summary><strong>Codex</strong></summary>

```bash
codex mcp add yango-retail \
  --env YANGO_RETAIL_TOKEN=your_token \
  -- npx -y mcp-yango-retail@latest
```

Check the connection with `codex mcp list`.

[Codex MCP documentation](https://developers.openai.com/codex/mcp/)
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Open **Settings → Developer → Edit Config** and add this entry to `mcpServers`:

```json
{
  "mcpServers": {
    "yango-retail": {
      "command": "npx",
      "args": ["-y", "mcp-yango-retail@latest"],
      "env": { "YANGO_RETAIL_TOKEN": "your_token" }
    }
  }
}
```

If **Edit Config** is unavailable, use `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows.

[Claude Desktop MCP documentation](https://claude.com/docs/connectors/building/mcp-apps/getting-started)
</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add \
  --env YANGO_RETAIL_TOKEN=your_token \
  --transport stdio \
  --scope user \
  yango-retail \
  -- npx -y mcp-yango-retail@latest
```

Check it with `claude mcp list`.

[Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)
</details>

<details>
<summary><strong>Cursor</strong></summary>

Add a global server to `~/.cursor/mcp.json` on macOS/Linux or `%USERPROFILE%\.cursor\mcp.json` on Windows:

```json
{
  "mcpServers": {
    "yango-retail": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-yango-retail@latest"],
      "env": { "YANGO_RETAIL_TOKEN": "your_token" }
    }
  }
}
```

[Cursor MCP documentation](https://cursor.com/docs/mcp)
</details>

<details>
<summary><strong>VS Code</strong></summary>

Run **MCP: Open User Configuration** from the Command Palette and add:

```json
{
  "servers": {
    "yango-retail": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-yango-retail@latest"],
      "env": { "YANGO_RETAIL_TOKEN": "${input:yango_retail_token}" }
    }
  },
  "inputs": [
    {
      "type": "promptString",
      "id": "yango_retail_token",
      "description": "Yango Tech Retail Bearer token",
      "password": true
    }
  ]
}
```

Check it with **MCP: List Servers**.

[VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
</details>

## What you can ask it to do

### Orders and receipts

- **Create and cancel orders.** `create_order` and `cancel_order` change real order state.
- **Track orders.** `get_order`, `get_orders_state` and `query_order_events` return states, events and receipts.
- **Read receipts.** `get_receipt` returns fiscal receipt data when available.

### Catalog, prices and stock

- **Browse stores and products.** `get_stores` and `query_products` follow the catalog feed by cursor.
- **Manage products.** `create_products` upserts up to 100 products per call.
- **Manage prices and discounts.** `get_prices`, `set_prices`, `query_price_lists` and `create_discounts` work with batches of up to 100 entries.
- **Update stock.** `query_stocks` reads the feed and `update_stocks` changes up to 1,000 lines per call.

### Other API methods

`raw_request` calls another `/b2b/v1/*` endpoint, such as order updates, VAT, price-list links or 3PL delivery integration. Use a dedicated tool when one exists.

## When the account changes

This is a write API. Reading stores, catalog, prices, stock, order state and receipts does not change the account. Creating or cancelling orders, upserting products, changing prices, creating discounts and updating stock do.

Ask the assistant to show the target store, product ids, quantities and values before a write. The MCP annotations help compatible clients distinguish read-only, write and destructive actions, but the final confirmation behaviour belongs to the AI client.

## Getting access

Yango Tech issues tokens per retailer account through the integration manager; there is no self-service token portal described in this repository.

1. Contact your Yango Tech integration manager and request a retailer Bearer token.
2. Put it into `YANGO_RETAIL_TOKEN`.
3. Keep the token out of Git and share it only with the AI client configuration.

The API backend is `https://api.retailtech.yango.com`; every request is a POST under `/b2b/v1/*` with `Authorization: Bearer <token>`.

## Configuration

| Variable | Required | Default | Description |
|---|---:|---|---|
| `YANGO_RETAIL_TOKEN` | yes | — | Bearer token issued by Yango Tech. `YANGO_AUTH_TOKEN` is accepted as an alias. |
| `YANGO_RETAIL_API_BASE_URL` | no | `https://api.retailtech.yango.com` | API root override. |
| `YANGO_RETAIL_TIMEOUT_MS` | no | `60000` | Per-request timeout in milliseconds. |
| `YANGO_RETAIL_MAX_RETRIES` | no | `3` | Retries for temporary errors; writes are not replayed. |

## Limits and background work

- **The safe request budget is 5 requests per second per token and endpoint.** The server retries 429 responses but does not proactively throttle every call.
- **Batch limits apply.** Products, prices and discounts accept up to 100 entries; stock updates accept up to 1,000 lines.
- **There are no delete endpoints** for products, price lists, prices or discounts.
- **No persistent observation.** The server works during a call and does not watch orders or stock in the background. If your AI client supports scheduled tasks, ask it to check order states or stock periodically.
- **No automatic rollback.** After an uncertain write, inspect the returned order, price or stock before repeating the request.

## Telemetry

The server sends anonymous technical usage pings: event names, tool names and versions, never tokens, arguments or business data. Set `ASKADS_TELEMETRY=0` to opt out. Details are in [Development](docs/DEVELOPMENT.md).

## Technical documentation

- [All tools](docs/TOOLS.md) — inputs, responses, API gaps and batch limits.
- [Development](docs/DEVELOPMENT.md) — local setup and project checks.
- [Publishing](docs/PUBLISHING.md) — package release and MCP catalog listing.

## Support

Questions and issues: [GitHub Issues](https://github.com/A1-x-Tech/mcp-yango-retail/issues) or Telegram [@gistrec](http://t.me/gistrec).

---

## Русская версия

### Yango Tech Retail MCP

Yango Tech Retail MCP помогает управлять магазинами, заказами, товарами, ценами, скидками и остатками через AI-приложение. Сервер подключается к B2B API ритейл-платформы Yango Tech и превращает рутинные операции в диалог.

[Подключить сервер](#быстрый-старт) · [Посмотреть сценарии](#что-можно-поручить) · [Открыть техническую документацию](docs/TOOLS.md)

### Быстрый старт

1. Получите Bearer-токен у интеграционного менеджера Yango Tech.
2. Подключите сервер по инструкции выше. Для Codex:

   ```bash
   codex mcp add yango-retail \
     --env YANGO_RETAIL_TOKEN=ваш_токен \
     -- npx -y mcp-yango-retail@latest
   ```

3. Начните с чтения:

   > Покажи магазины и остаток товара 4607034171438 в каждом.

### Что можно поручить

- Читать магазины, каталог, цены, остатки, статусы заказов и чеки.
- Создавать и отменять заказы, менять цены, создавать скидки и обновлять остатки.
- Загружать товары пакетами и получать события по заказам.
- Использовать `raw_request` для методов API без отдельного инструмента.

### Границы действий

Заказы, цены, скидки, товары и остатки изменяются в реальном аккаунте. Перед записью попросите ассистента показать магазин, товары, количества и новые значения. Сервер не наблюдает за заказами и остатками в фоне; периодические проверки возможны через задания AI-приложения, если оно их поддерживает.

API ограничивает частоту запросов и размер пакетов. При временном ограничении сервер делает повторы с задержкой, но после неопределённой записи автоматического отката нет.

### Техническая глубина

Схемы инструментов, переменные окружения и ограничения находятся в [технической документации](docs/TOOLS.md). Описание разработки — в [Development](docs/DEVELOPMENT.md).

### Поддержка

[GitHub Issues](https://github.com/A1-x-Tech/mcp-yango-retail/issues) или Telegram [@gistrec](http://t.me/gistrec).
