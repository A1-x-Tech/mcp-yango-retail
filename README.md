# Yango Tech Retail MCP

[![npm](https://img.shields.io/npm/v/mcp-yango-retail)](https://www.npmjs.com/package/mcp-yango-retail)
[![CI](https://github.com/A1-x-Tech/mcp-yango-retail/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-yango-retail/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

MCP server for the **[Yango Tech Retail](https://retail.yango-tech.com) (grocery platform) B2B API**:
create and track orders, browse the product catalog, manage prices, discounts and stock levels
across darkstores — from Claude, Cursor, Codex and other AI clients, in natural language.

The server wraps the retailer-facing API at `api.retailtech.yango.com` (the one the official
[yango-tech-grocery-client](https://github.com/yango-tech/yango-tech-grocery-client) Python
library speaks). The assistant assembles request bodies, follows pagination cursors, checks
order states and receipts, and updates prices and stocks for you.

## Quick start

1. Get a Bearer token from Yango Tech for your retailer account (via your Yango Tech
   integration manager — there is no self-service token portal).
2. Add the server — for example, in Claude Code ([other clients](#installation)):

   ```bash
   claude mcp add yango-retail \
     -e YANGO_RETAIL_TOKEN=your_token \
     -- npx -y mcp-yango-retail
   ```

3. Ask the assistant: "List our stores and show the current stock of product 4607034171438 in each."

## What it can do

- **Orders**: `create_order`, `cancel_order`, `get_order` (details), `get_orders_state`
  (batch tracking), `query_order_events` (event feed: new orders, state changes, receipts),
  `get_receipt` (fiscal receipts).
- **Catalog**: `get_stores` (darkstores), `query_products` (cursor-based catalog feed),
  `create_products` (upsert, ≤100 per call).
- **Pricing**: `query_price_lists`, `get_prices`, `set_prices` (≤100 per call),
  `create_discounts` (≤100 per call).
- **Stocks**: `query_stocks` (feed across stores), `update_stocks` (modify or initialize,
  ≤1000 lines per call).
- **Escape hatch**: `raw_request` — any other `/b2b/v1/*` endpoint (orders/update, VAT,
  price-list links, 3PL delivery integration, …) with an SSRF guard on the path.

Resilience: per-request timeout (AbortController), automatic retries with exponential backoff
(429 always; 5xx/network errors only for read calls — writes are never replayed), and error
messages that carry the `x-yatraceid`/`x-yarequestid` headers Yango Tech support asks for.

## Example prompts

- "Create order ORD-1042 for store LAVKA-3: 2 × product 123 at 150.00, cash on delivery."
- "What state are orders ORD-1040 through ORD-1042 in?"
- "Pull the full product catalog and list items missing a barcode."
- "Set the price of product 123 to 99.90 in price list default and check it back."

## API access

- Backend: `https://api.retailtech.yango.com`, all endpoints under `/b2b/v1/*`, every call is
  a POST with a JSON body.
- Auth: `Authorization: Bearer <token>` on every request. Tokens are issued by Yango Tech per
  retailer account; treat them as secrets.
- There is no public first-party docs portal; the official Python client is the de-facto spec
  this server follows (see [docs/TOOLS.md](docs/TOOLS.md) for known gaps, e.g. undocumented
  discount payload keys).

## Installation

<details open>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add yango-retail \
  -e YANGO_RETAIL_TOKEN=your_token \
  -- npx -y mcp-yango-retail
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "yango-retail": {
      "command": "npx",
      "args": ["-y", "mcp-yango-retail"],
      "env": {
        "YANGO_RETAIL_TOKEN": "your_token"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in the project):

```json
{
  "mcpServers": {
    "yango-retail": {
      "command": "npx",
      "args": ["-y", "mcp-yango-retail"],
      "env": {
        "YANGO_RETAIL_TOKEN": "your_token"
      }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code (GitHub Copilot)</b></summary>

Add to `.vscode/mcp.json` — note the key is `servers`, not `mcpServers`:

```json
{
  "servers": {
    "yango-retail": {
      "command": "npx",
      "args": ["-y", "mcp-yango-retail"],
      "env": {
        "YANGO_RETAIL_TOKEN": "your_token"
      }
    }
  }
}
```

</details>

⚠️ The token is stored in plain text in the client's config file — restrict access to it.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `YANGO_RETAIL_TOKEN` | yes | — | Bearer token issued by Yango Tech (`YANGO_AUTH_TOKEN` is accepted as an alias). Treat it as a secret. |
| `YANGO_RETAIL_API_BASE_URL` | no | `https://api.retailtech.yango.com` | API root override (`YANGO_API_BASE_URL` is accepted as an alias). |
| `YANGO_RETAIL_TIMEOUT_MS` | no | `60000` | Per-request timeout, ms. |
| `YANGO_RETAIL_MAX_RETRIES` | no | `3` | Retries on transient errors (429 always; 5xx/network for reads only). |

## Requirements

- Node.js 20+.
- A Yango Tech Retail Bearer token.

## Limitations

- This is a **write API**: `create_order`, `cancel_order`, `create_products`, `set_prices`,
  `create_discounts` and `update_stocks` change real data. Tools carry MCP annotations
  (read-only / write / destructive) so MCP clients can gate them.
- The official client self-throttles at 5 requests/second per (token, endpoint) — treat that
  as the safe budget; the server retries 429 with backoff but does not rate-limit proactively.
- Batch limits per request: 100 products / prices / discounts, 1000 stock lines.
- No delete endpoints exist for products, price lists, prices or discounts.

## Documentation

- [docs/TOOLS.md](docs/TOOLS.md) — every tool, response formats, known API gaps.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — building, testing, telemetry.
- [docs/PUBLISHING.md](docs/PUBLISHING.md) — release and registry checklist.

## Telemetry

The server sends anonymous usage pings (event names, tool names, versions — never tokens,
arguments or data). Opt out with `ASKADS_TELEMETRY=0`. Details in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Support

Questions and issues: [GitHub Issues](https://github.com/A1-x-Tech/mcp-yango-retail/issues)
or Telegram [@gistrec](https://t.me/gistrec).

## License

[MIT](./LICENSE)
