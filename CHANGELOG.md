# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-08-19

### Changed

- **The server no longer exits because of configuration.** A missing `YANGO_RETAIL_TOKEN`
  (alias `YANGO_AUTH_TOKEN`) is a survivable state: the server starts, completes the MCP
  handshake, serves the full tool list and opens the `initialize` instructions with the fix
  (which variable to set, and that the server must be restarted afterwards — the token is
  read from the environment only at startup). The first tool call then fails with the
  historical startup message verbatim (`CredentialsError`, an `isError` response) — before
  any retries and without touching the network — instead of the client showing a dead
  server with no reason.

### Added

- Telemetry event `unconfigured_start` (with the same closed reason vocabulary,
  `missing_token`): a server without a token now survives to the MCP handshake, so a
  degraded start is counted separately instead of inflating `server_start` or dying as
  `startup_failed` (which now means a config malformed at load time and is sent
  fire-and-forget).

## [1.0.1] — 2026-08-12

### Added

- Server instructions. The MCP `initialize` response now carries a short briefing for the calling
  model: what this API is and is not, what it cannot do, and the quotas, retry rules and misleading
  failures that should change how it is used. That knowledge previously lived only in the README,
  which a model never reads.

## [1.0.0] — 2026-08-11

### Changed

- Declared stable. The tool surface, input schemas and environment variables of 0.1.x carry over
  unchanged — this release marks API stability, not new behaviour.

## [0.1.0] — 2026-08-09

First full release (version 0.0.1 was a stub reserving the npm name).

### Added

- 16 MCP tools for the Yango Tech Retail (grocery platform) B2B API
  (`api.retailtech.yango.com`, `/b2b/v1/*`, POST-only):
  - **Orders and receipts**: `create_order`, `cancel_order`, `get_order`,
    `get_orders_state` (batch tracking), `query_order_events` (cursor event feed),
    `get_receipt` (fiscal receipts by receipt id or order id).
  - **Catalog**: `get_stores`, `query_products` (cursor feed, default limit 300),
    `create_products` (upsert, ≤100 per request).
  - **Pricing**: `query_price_lists`, `get_prices`, `set_prices` (≤100 per request),
    `create_discounts` (≤100 per request; payload keys documented as an upstream gap).
  - **Stocks**: `query_stocks` (cursor feed), `update_stocks` (modify/initialize,
    ≤1000 lines per request).
  - `raw_request` — direct call to any other `/b2b/v1/*` endpoint.
- HTTP client: `Authorization: Bearer` on every request, AbortController timeout,
  retries with exponential backoff (429 always; 5xx/network only for idempotent reads —
  writes are never replayed), SSRF guard on `raw_request` paths, and errors carrying the
  `x-yatraceid`/`x-yarequestid` trace headers.
- Per-tool MCP annotations (`READ_ONLY`/`WRITE`/`DESTRUCTIVE`) — this is a write API;
  the order cancellation and the raw escape hatch are marked destructive.
- Anonymous usage telemetry (opt-out `ASKADS_TELEMETRY=0`).
- Tests: 74 offline unit tests + 3 smoke tests of the built `dist/` (including a real
  MCP handshake over stdio); CI on Node 20/22/24; daily read-only health check.
