#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { YangoRetailClient } from "./client.js";
import { ConfigError, loadConfig } from "./config.js";
import { instrumentToolCalls, Telemetry } from "./telemetry.js";
import type { YangoRetailConfig } from "./types.js";
import { registerCatalogTools } from "./tools/catalog.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerPricingTools } from "./tools/pricing.js";
import { registerRawTool } from "./tools/raw.js";
import { registerStockTools } from "./tools/stocks.js";

/**
 * Prose handed to the calling model in the `initialize` result — the only place
 * it learns what the tool list cannot say: which API this is, what the API
 * refuses to do, and the behaviours that make a naive loop expensive or unsafe.
 */
const INSTRUCTIONS =
  "Yango Tech Retail is the retailer-facing B2B API of the Yango Tech grocery/darkstore platform — " +
  "the backend of one retailer account, not a marketplace seller portal or the Yango taxi/delivery " +
  "API. Nothing has a delete endpoint: products and prices are upserts, discounts can only be " +
  "created and never listed back, price lists only queried. Every endpoint is a POST under " +
  "/b2b/v1/*, reads included; there is no public docs portal: write responses are undocumented (2xx " +
  "= success), unknown fields pass through, and untooled endpoints go through raw_request, which " +
  "can write anything. Stay near 5 requests/second per endpoint; 429 is retried with backoff but " +
  "nothing throttles proactively, and a failed write is never replayed: after a 5xx or timeout " +
  "confirm with a read before re-sending. Some reads report per-item failures inside a 200 response " +
  "— check items, not just the status; errors carry x-yatraceid/x-yarequestid for support tickets. " +
  "Batch caps: 100 products, prices or discounts and 1000 stock lines per call. Writes change real " +
  "data at once: orders, catalog, customer-facing prices and stock.";

/** Reads the package version so the server reports its real version to MCP clients. */
function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Loads the config, reporting the drop-off if it is missing. An unconfigured
 * server dies before the MCP handshake, so this ping is the only trace such an
 * install ever leaves — and it has to be awaited, or process.exit() below would
 * kill the request in flight.
 */
async function loadConfigOrExit(telemetry: Telemetry): Promise<YangoRetailConfig> {
  try {
    return loadConfig();
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(`Error: ${err.message}`);
    await telemetry.sendBlocking("startup_failed", { reason: err.reason });
    process.exit(1);
  }
}

async function main(): Promise<void> {
  // Anonymous usage pings (ids/names/versions only, never data or arguments);
  // opt out with ASKADS_TELEMETRY=0. Built before the config so a missing token
  // can be reported; wired to the server before tools register.
  const telemetry = new Telemetry(readVersion());
  const config = await loadConfigOrExit(telemetry);
  const client = new YangoRetailClient(config);

  const server = new McpServer(
    {
      name: "mcp-yango-retail",
      version: readVersion(),
    },
    // Surfaces in the initialize result, ahead of any tool call.
    { instructions: INSTRUCTIONS },
  );

  instrumentToolCalls(server, telemetry);
  server.server.oninitialized = () => {
    telemetry.setClientInfo(server.server.getClientVersion());
    telemetry.send("server_start");
  };

  registerOrderTools(server, client);
  registerCatalogTools(server, client);
  registerPricingTools(server, client);
  registerStockTools(server, client);
  registerRawTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-yango-retail running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting mcp-yango-retail:", err);
  process.exit(1);
});
