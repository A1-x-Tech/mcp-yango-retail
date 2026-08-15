# CLAUDE.md — mcp-yango-retail

MCP server for the Yango Tech Retail (grocery platform) B2B API (TypeScript, stdio).
A **write API**: tools create orders and overwrite prices, discounts and stock levels.
Backend: `https://api.retailtech.yango.com`, every endpoint under `/b2b/v1/*`, **every
call is a POST with a JSON body — including reads**. Auth is `Authorization: Bearer
<token>` on every request (`YANGO_RETAIL_TOKEN`). There is no public docs portal: the
official Python client (yango-tech/yango-tech-grocery-client) is the de-facto spec.
`raw_request` is the escape hatch for the ~15 endpoints without a dedicated tool.

## Commands

```bash
npm run dev        # run from source (tsx watch)
npm test           # unit tests + dist smoke (incl. a real MCP handshake), no network
npm run typecheck  # types for src + tests
npm run build      # emit dist/
npm run smoke      # live READ-ONLY call (stores/get; needs YANGO_RETAIL_TOKEN)
```

## Architecture

- `src/config.ts` — env → config. A missing `YANGO_RETAIL_TOKEN` (alias `YANGO_AUTH_TOKEN`)
  is NOT an error: the field stays `undefined`, the server starts degraded and the client
  raises `CredentialsError` at call time (telemetry reason: `missing_token`). Also home to
  `CredentialsError` / `MISSING_TOKEN_MESSAGE` (opens with the historical startup error
  verbatim, then names the variables and the restart). `ConfigError` (with a `reason` code)
  is reserved for malformed values, caught by `loadConfigOrDegraded` in `index.ts` (no such
  checks exist today). Optional: `YANGO_RETAIL_API_BASE_URL` (aliases `YANGO_API_BASE_URL`,
  `YANGO_DOMAIN`), `YANGO_RETAIL_TIMEOUT_MS`, `YANGO_RETAIL_MAX_RETRIES`.
- `src/client.ts` — all HTTP. `request(path, body, {idempotent})` first rejects a missing
  token with `CredentialsError` (before building the request, the retries and fetch — the
  message is the product: it names the env variable to set and the needed restart), then
  POSTs JSON with the Bearer header, rejects paths that resolve to a foreign origin (SSRF
  guard), enforces an AbortController timeout that also covers reading the body, retries
  with backoff (honors `Retry-After`) and throws
  `YangoRetailError(status, body, {traceId, requestId})` with the
  `x-yatraceid`/`x-yarequestid` headers. One typed method per endpoint; page-size
  defaults (products 300, others 100), the `price_per_quantity` default and the stocks
  `update_mode` mapping live here.
- `src/tools/orders.ts` — six order/receipt tools; `src/tools/catalog.ts` — stores +
  products; `src/tools/pricing.ts` — price lists, prices, discounts; `src/tools/stocks.ts`
  — stock feed + update; `src/tools/raw.ts` — `raw_request`. `src/tools/util.ts` —
  `ok`/`fail`, the `READ_ONLY`/`WRITE`/`DESTRUCTIVE` annotation presets and shared zod
  schema factories.
- `src/index.ts` — wires every `register*` into the McpServer. `loadConfigOrDegraded()`
  catches `ConfigError`, pings `startup_failed` (fire-and-forget) and degrades the config to
  "no token"; an unconfigured start prepends `UNCONFIGURED_PREFIX` — plus
  `Configuration problem: <message>` when a ConfigError was caught — to the initialize
  `instructions`, and `oninitialized` sends `server_start` for a configured install or
  `unconfigured_start` (with the reason) otherwise.
- `src/telemetry.ts` — anonymous usage pings (ids/names/versions only, never data or
  arguments; fire-and-forget, must never block or throw; opt-out `ASKADS_TELEMETRY=0`).
  `server_start` means "a usable install started"; an install without a token sends
  `unconfigured_start` instead. The `reason` is a closed vocabulary (`missing_token`) —
  never a variable's name or value. `startup_failed` remains for a config unusable at load
  time (malformed values), also fire-and-forget.

## Conventions (do not break)

- **Never exit because of configuration.** A server that dies before the MCP handshake
  leaves the user with a red cross and no reason — telemetry across this line of servers
  showed that state accounted for nearly every unconfigured install. A missing token is a
  survivable state: start, answer `initialize`/`tools/list` (with the unconfigured prefix in
  the instructions), and reject tool calls with `CredentialsError`. There are no login
  tools: the token comes only from the environment, so the fix is the operator setting
  `YANGO_RETAIL_TOKEN` (or its alias `YANGO_AUTH_TOKEN`) and restarting the server.
  `config.test.ts`, `client.test.ts` and `test/dist-smoke.test.js` pin this.
- **Credential failures are not transport failures.** `CredentialsError` is thrown before
  the retry/backoff branch (and before fetch) in `request()` — retrying it burns seconds of
  backoff before the user sees the one message that helps. Pinned by "fetch must not be
  called" assertions in `client.test.ts`.
- **This is a write API — gate the retries.** Every endpoint is a POST, so "retry GETs"
  does not apply: `idempotent: true` is set only on side-effect-free reads (orders/get,
  orders/state, orders/events/query, receipts/get, stores/get, the query feeds,
  prices/get). 429 is always retried; 5xx/network errors only for idempotent calls —
  a 502 after a write commits could duplicate or reapply the write. `raw_request` is
  never idempotent.
- **Annotations are per-tool, not global.** Reads carry `READ_ONLY`, state-changing calls
  `WRITE`, `cancel_order` and `raw_request` `DESTRUCTIVE` — all four hints set explicitly.
  `annotations.test.ts` pins the full map; extend it with every new tool.
- **Wire mapping lives in the client, not the tools.** Tools never know paths, the
  `update_mode` field, page-size defaults or the `price_per_quantity` fallback — that is
  `client.ts`'s job. The `receipts/get` exactly-one-of check also lives in the client (it
  must reject before any network call).
- **Validate inputs with zod** in `inputSchema` (plain object of zod fields, not
  `z.object()`); tool descriptions are in English. Use the shared schema **factories** in
  `util.ts` (a fresh schema per field avoids `$ref` dedup in the JSON schema). Keep nested
  objects `.passthrough()` — the spec has known gaps and the API evolves.
- **Output compact JSON via `ok`** — the consumer is an LLM; pretty-printing burns tokens.
  Responses pass through verbatim (describe the fields in the tool `description`, the only
  place the external model reads).
- **Money is decimal strings** (`"150.00"`), never JSON numbers — but `prices/get` may
  return numbers. Don't "fix" either direction.
- **Do not invent undocumented shapes.** Write-endpoint response bodies, the error body
  schema and the `discount_activity_period`/`discount_value` keys are untyped upstream —
  pass them through and say so in the description, as `create_discounts` does.
- **Batch limits are schema constraints:** 100 for products/prices/discounts, 1000 for
  stocks — enforced in zod, mirrored from the official client.

## Adding a tool

Before changing the tool registry, read [the MCP capability documentation contract](docs/CAPABILITY-DOCUMENTATION.md). Every registered tool must have exactly one task-oriented page in `docs/capabilities/`; update that page, the index, and the coverage test in the same change.

1. Add (or extend) `src/tools/<domain>.ts` with the `server.registerTool` call.
2. If it hits a new endpoint, add a typed method to `src/client.ts` — decide its
   `idempotent` flag consciously (see Conventions).
3. Import and call the register fn in `src/index.ts` (new modules only).
4. Add it to the `EXPECTED` annotations map in `annotations.test.ts`, to the tool list in
   its `<domain>.test.ts` and `test/dist-smoke.test.js`, and to `docs/TOOLS.md`.
5. `npm run typecheck && npm test`.

## Releasing

Full walkthrough (incl. the MCP registry and its pitfalls): `docs/PUBLISHING.md`.

1. Bump `version` in **three places, byte-identical**: `package.json`,
   `server.json` (root) and `server.json` `packages[0]`; update `CHANGELOG.md`
   (move `[Unreleased]` into a dated section). Check: `grep -n '"version"' package.json server.json`.
2. `npm publish` (runs typecheck + tests + build via `prepublishOnly` / `prepare`).
3. `git commit`, `git tag -a vX.Y.Z -m vX.Y.Z`, `git push origin main --follow-tags`.
4. GitHub Release: `gh release create vX.Y.Z --title vX.Y.Z --generate-notes --verify-tag`.
5. MCP registry: `mcp-publisher logout && mcp-publisher login github --token "$(gh auth token)" && mcp-publisher publish`.
