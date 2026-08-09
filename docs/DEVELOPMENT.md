# Development

## Requirements

- Node.js 20+ (the published package ships compiled `dist/`; `npx` needs no separate
  install). CI runs the suite on Node 20, 22 and 24.

## Commands

```bash
npm install
npm run dev        # run from source with tsx watch
npm test           # unit tests + dist smoke (node:test), no network
npm run typecheck  # type-check src + tests (no emit)
npm run build      # clean dist/ and compile with tsc
npm run smoke      # live READ-ONLY call: stores/get
```

## Local run

```bash
npm run build
YANGO_RETAIL_TOKEN=... node dist/index.js
# optional: YANGO_RETAIL_API_BASE_URL, YANGO_RETAIL_TIMEOUT_MS, YANGO_RETAIL_MAX_RETRIES
```

`npm run smoke` needs the same credentials and makes one live read (`stores/get`, no
writes). Remember this is a **write API** overall: the unit suite never touches the
network, but manual testing with a real token can create real orders and overwrite real
prices and stocks — prefer `get_stores`/`query_products`/`get_orders_state` when poking
around. A test environment host has been mentioned by third parties
(`https://api.tst.eu.cloudretail.tech`) but is not part of the official client — verify
with Yango Tech before pointing `YANGO_RETAIL_API_BASE_URL` at it.

## Tests

Unit tests mock `globalThis.fetch` (client) or use a fake server + mock/real client
(tools), so the whole suite runs offline. Put a `*.test.ts` next to the code it covers;
`npm run typecheck && npm test` is the gate (also run by `prepublishOnly`).
`test/dist-smoke.test.js` additionally exercises the built `dist/` artifact, including a
real MCP handshake over stdio.

## Usage telemetry

The server sends anonymous events to `usage.gistrec.cloud` (`server_start` when a client
connects, `tool_call` with the tool **name**, and `startup_failed` with a reason code) to
count active installs and tool demand. An event carries only non-identifying technical
fields: a random installation id (`~/.config/mcp-yango-retail/instance-id`), the package
version, the AI application's name and version from the MCP handshake, the Node.js version
and the OS.

The token, account data, tool arguments and prompt texts are never sent or stored
(implementation: `src/telemetry.ts`). Sends run in the background with a 2-second timeout
and are silently skipped on any error. Opt out for every Ask Ads MCP server at once:
`ASKADS_TELEMETRY=0`.
