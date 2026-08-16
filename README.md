# <img src="./assets/a1-logo.svg" alt="A1" width="40"> Yango Tech Retail MCP

**English** | [Русский](./README.ru.md)

[![npm](https://img.shields.io/npm/v/mcp-yango-retail)](https://www.npmjs.com/package/mcp-yango-retail)
[![CI](https://github.com/A1-x-Tech/mcp-yango-retail/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-yango-retail/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-yango-retail/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-yango-retail)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**A1 Yango Tech Retail MCP** connects an AI app to a retailer account in Yango Tech Retail. Use ordinary language to check stores, orders, products, prices and stock, or to create orders and update account data when needed.

The server works with the retailer-facing B2B API for grocery retail and darkstores. It is not a marketplace seller portal, a taxi service or Yango Delivery.

- **16 tools.** Nine read-only tools, five write tools and two potentially destructive tools cover stores, catalog, pricing, stock, orders and receipts.
- **A safe read-only start.** Check connected data before changing anything in the account.
- **Clear write boundaries.** Order creation and cancellation, product upserts, price changes, discount creation and stock updates are separated from reads.
- **Additional API coverage.** Technical users can reach methods without a dedicated tool through `raw_request`.

Start with:

> List our stores and show the stock of product `[product ID]` in each.

[Connect the server](#quick-start) · [Explore use cases](#what-you-can-ask-it-to-do) · [Open technical documentation](#technical-documentation)

---

## See it work in a minute

> **You:** List our stores and show the stock of product `[product ID]` in each.
>
> **Assistant:** I will return the stores, their ids and the current stock of this product in each one.
>
> **You:** Show the price of this product in every price list.
>
> **Assistant:** I will return the price lists and the current product price in each one. No account data will be changed.
>
> **You:** Change the price to `99.90` in price list `[price-list ID]`.
>
> **Assistant:** This will change a real customer-facing price. I will show the product, price list, current value and new value before asking for confirmation.
>
> **You:** Confirm.
>
> **Assistant:** The price has been updated. I will read the price list again and return the current value.

> Stores, products, prices, stock and order states always come from the connected retailer account and the current API response.

## Contents

- [Quick start](#quick-start)
- [What you can ask it to do](#what-you-can-ask-it-to-do)
- [How retail data is connected](#how-retail-data-is-connected)
- [What changes in the account](#what-changes-in-the-account)
- [Getting access](#getting-access)
- [Configuration](#configuration)
- [Data and telemetry](#data-and-telemetry)
- [Limits and background work](#limits-and-background-work)
- [Technical documentation](#technical-documentation)
- [Support](#support)

## Quick start

You need Node.js 20+, a Yango Tech Retail account and a retailer Bearer token.

1. [Get a token](#getting-access) from your Yango Tech integration manager.
2. Add the server to your AI app using one of the instructions below.
3. Start with a read-only request:

   > List our stores and show the stock of product `[product ID]` in each.

<details open>
<summary><strong>Codex</strong></summary>

<br>

**In the app:**

1. Open **Settings → Plugins → MCP servers**.
2. Select **Add server**.
3. Add the launch command `npx -y mcp-yango-retail@latest` and the `YANGO_RETAIL_TOKEN` environment variable with your token.

**From the command line:**

```bash
codex mcp add yango-retail \
  --env YANGO_RETAIL_TOKEN=your_token \
  -- npx -y mcp-yango-retail@latest
```

Check the connection:

```bash
codex mcp list
```

[Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

</details>

<details>
<summary><strong>Claude Code</strong></summary>

<br>

```bash
claude mcp add \
  --env YANGO_RETAIL_TOKEN=your_token \
  --transport stdio \
  --scope user \
  yango-retail \
  -- npx -y mcp-yango-retail@latest
```

Check the connection:

```bash
claude mcp list
```

[Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

<br>

1. Open Claude Desktop and go to **Settings → Developer**.
2. Select **Edit Config**.
3. Add the server to `mcpServers`:

```json
{
  "mcpServers": {
    "yango-retail": {
      "command": "npx",
      "args": ["-y", "mcp-yango-retail@latest"],
      "env": {
        "YANGO_RETAIL_TOKEN": "your_token"
      }
    }
  }
}
```

If **Edit Config** is unavailable, open the configuration file directly:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

[Claude Desktop MCP documentation](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

</details>

<details>
<summary><strong>Cursor</strong></summary>

<br>

Add a user-level server to `~/.cursor/mcp.json` on macOS/Linux or `%USERPROFILE%\.cursor\mcp.json` on Windows:

```json
{
  "mcpServers": {
    "yango-retail": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-yango-retail@latest"],
      "env": {
        "YANGO_RETAIL_TOKEN": "your_token"
      }
    }
  }
}
```

[Cursor MCP documentation](https://cursor.com/docs/mcp)

</details>

<details>
<summary><strong>VS Code</strong></summary>

<br>

Run **MCP: Open User Configuration** from the Command Palette and add:

```json
{
  "servers": {
    "yango-retail": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-yango-retail@latest"],
      "env": {
        "YANGO_RETAIL_TOKEN": "${input:yango_retail_token}"
      }
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

Check the server with **MCP: List Servers**.

[VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers)

</details>

## What you can ask it to do

### Check stores and the product catalog

- List stores with their ids, status, location, address and name when available.
- Browse products by cursor and inspect their status, category, localized names, barcodes and custom attributes.
- Create or update up to 100 products in one request. Product records are upserted rather than added as duplicates.

### Check and update prices

- List price lists and read product prices from one or more lists.
- Compare the same product across price lists.
- Set up to 100 prices in one request using decimal strings such as `"150.00"`.
- Create up to 100 store-specific discounts after confirming the expected field structure with Yango Tech.

### Check and update stock

- Read stock across stores, including the product, quantity and shelf type.
- Update up to 1,000 stock lines for one store.
- Use `initialize` for the first stock load and `modify` for regular updates.

### Work with orders and receipts

- Create an order after collecting its store, products, quantities, prices, delivery details and payment type.
- Read order details and check the current states of several orders at once.
- Follow the order event feed for new orders, state changes and issued receipts.
- Read a fiscal receipt by order id or receipt id.
- Cancel an order after checking its current state and the cancellation reason.

### Use additional API methods

`raw_request` covers `/b2b/v1/*` methods without a dedicated tool, including order updates, VAT data, price-list links, picking, logistics and 3PL delivery operations. It can change real account data and is intended for technical users who understand the upstream API.

Complete schemas, response fields and API gaps are available in the [tool reference](docs/TOOLS.md).

## How retail data is connected

| Entity | How it is used |
|---|---|
| Store | Identifies the location whose stock and discounts are read or changed |
| Product | The same `product_id` connects catalog data, prices, stock and order items |
| Price list | Holds product prices separately from a store; store-to-list links use another API method |
| Stock line | Connects a product, store, quantity and shelf type; sellable stock normally uses `store` |
| Order | Uses a retailer-supplied `order_id`; order details and current state are read separately |
| Receipt | Can be requested by `order_id` or `receipt_id` when it is available |

Feeds use cursor pagination. A page with fewer items than the requested limit means the current product, price-list or stock feed is exhausted. The order event feed is continuous: keep its last cursor and request the next page later.

## What changes in the account

The server exposes MCP annotations for read-only, write and destructive actions. The AI client decides when and how to ask for confirmation.

| Action | Result | Changes the account |
|---|---|---:|
| Read stores, products, price lists, prices, stock, orders or receipts | Returns current account data | No |
| Create or update products | Upserts real catalog records | Yes |
| Set prices | Overwrites customer-facing prices | Yes |
| Create discounts | Adds real store-specific discounts | Yes |
| Update or initialize stock | Overwrites stock quantities for a store | Yes |
| Create an order | Adds a real order with the supplied `order_id` | Yes |
| Cancel an order | Changes the order to a cancellation state | Yes |
| `raw_request` | Calls another API method, including possible writes | Depends on the method |

Before a write, ask the assistant to show the target store, product ids, price list, quantities, current values and proposed values. Write responses are not fully documented upstream, so after a successful price or stock update the server can read the corresponding data again and show the current value.

## Getting access

Yango Tech issues a Bearer token for a retailer account through an integration manager. This repository does not describe a self-service token portal.

1. Contact your Yango Tech integration manager and request a retailer Bearer token.
2. Add it to the AI client as `YANGO_RETAIL_TOKEN`.
3. Keep it out of Git and share it only through the AI client's secret or environment-variable configuration.

The production API host is `https://api.retailtech.yango.com`. Every API call is a POST with a JSON body under `/b2b/v1/*`, including read operations.

> The token is stored in the AI client's local configuration. Treat it like a password and never commit a configuration containing a real token.

## Configuration

| Variable | Required | Default | Description |
|---|---:|---|---|
| `YANGO_RETAIL_TOKEN` | yes | — | Bearer token issued by Yango Tech; `YANGO_AUTH_TOKEN` is accepted as an alias |
| `YANGO_RETAIL_API_BASE_URL` | no | `https://api.retailtech.yango.com` | API root override; `YANGO_API_BASE_URL` and `YANGO_DOMAIN` are accepted as aliases |
| `YANGO_RETAIL_TIMEOUT_MS` | no | `60000` | Timeout for one request, in milliseconds |
| `YANGO_RETAIL_MAX_RETRIES` | no | `3` | Maximum retries for temporary failures; writes are not replayed after network or 5xx errors |
| `ASKADS_TELEMETRY` | no | enabled | `0`, `false`, `off` or `no` disables anonymous telemetry |

## Data and telemetry

### Requests to Yango Tech Retail

The server runs on your machine and sends retailer data directly to the configured Yango Tech Retail API host. The Bearer token is attached only to requests resolved against that host. Even `raw_request` accepts a relative path and rejects a path that resolves to another origin.

### Anonymous telemetry

By default, the server sends technical events to `usage.gistrec.cloud`: server start, called tool name and a fixed reason code when startup fails.

Events contain a random installation id, package version, AI client name and version, Node.js version and operating system. **The Bearer token, retailer data, tool arguments and prompts are not read or sent.** Telemetry has a two-second timeout and does not block tool calls.

To disable telemetry, add:

```text
ASKADS_TELEMETRY=0
```

The implementation is in [`src/telemetry.ts`](src/telemetry.ts).

## Limits and background work

- **The public API quota is not documented.** The official Python client keeps to 5 requests per second for one token and endpoint; use that as an operating guideline, not as a published API limit. This server does not proactively throttle every call.
- **429 responses are retried.** The server follows `Retry-After` when present and makes no more retries than `YANGO_RETAIL_MAX_RETRIES` allows.
- **Writes are not replayed after uncertain failures.** Network and 5xx retries apply only to side-effect-free reads. After an uncertain write, read the current order, price or stock before trying again.
- **Batch limits apply.** Products, prices and discounts accept up to 100 entries per request; stock updates accept up to 1,000 lines.
- **There is no background monitoring.** The server works only when called from the AI app. If the app supports scheduled tasks, it can check order states or stock periodically.
- **There is no automatic rollback.** A successful update changes the retailer account immediately.
- **Deletion is limited by the upstream API.** Products and prices are upserted; there are no known delete methods for products, prices or discounts.
- **Discount support is incomplete upstream.** The exact keys for the activity period and discount value are undocumented, and there is no known method to list or delete discounts. Confirm the payload with Yango Tech before using it.

## Technical documentation

- [All tools](docs/TOOLS.md) — input schemas, responses, pagination, API gaps and batch limits.
- [Development](docs/DEVELOPMENT.md) — local setup and project checks.
- [Publishing](docs/PUBLISHING.md) — package release and MCP catalog listing.
- [npm package](https://www.npmjs.com/package/mcp-yango-retail) — the published `mcp-yango-retail` package.
- [Official Yango Tech Python client](https://github.com/yango-tech/yango-tech-grocery-client) — the available upstream specification for this API.

## Support

Found a bug or missing a use case? [Create an issue](https://github.com/A1-x-Tech/mcp-yango-retail/issues) or message us on [Telegram](https://t.me/a1_mcp).

<br>

<p align="center">
  <img src="https://github.com/ztemerbekov/a1-yandex-kit-skills/raw/main/assets/images/mona-hifive-yandex-kit-warm.gif" alt="Две Моны дают пять" width="256">
</p>

<p align="center">
  Вы дочитали до конца!
</p>
