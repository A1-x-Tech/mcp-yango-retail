#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { YangoRetailClient } from "./client.js";
import { ConfigError, DEFAULT_BASE, loadConfig } from "./config.js";
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

/**
 * Prepended to INSTRUCTIONS when no token is configured. The model reads this
 * before it picks a tool, so an unconfigured session opens with the fix rather
 * than with a failed call. There is no in-chat login here: the token comes
 * only from the environment, so the fix is an operator action + restart.
 */
const UNCONFIGURED_PREFIX =
  "ATTENTION: Yango Tech Retail is not connected yet — YANGO_RETAIL_TOKEN is not set, so every " +
  "tool call will fail. The operator must set YANGO_RETAIL_TOKEN (the Bearer token issued by " +
  "Yango Tech for the retailer account, obtained via the Yango Tech integration manager — there " +
  "is no self-service token portal; YANGO_AUTH_TOKEN is accepted as an alias) in the MCP " +
  "client's server config and restart this server — the variables are read only at startup. ";

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
 * Loads the config without dying on a bad value. A server that exits here never
 * completes the MCP handshake, so the user sees a dead server and no reason —
 * instead the problem is carried into the session, where the model can read it
 * and relay it. (A missing token is not an error at all — loadConfig leaves the
 * field undefined; today it has no malformed-value checks either, so the catch
 * guards future ones.)
 */
function loadConfigOrDegraded(telemetry: Telemetry): {
  config: YangoRetailConfig;
  problem?: ConfigError;
} {
  try {
    return { config: loadConfig() };
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(`Error: ${err.message}`);
    // Fire-and-forget now that the process survives: the historical
    // `startup_failed` funnel stays comparable, but nothing blocks startup.
    telemetry.send("startup_failed", { reason: err.reason });
    return {
      config: {
        apiBase:
          process.env.YANGO_RETAIL_API_BASE_URL ||
          process.env.YANGO_API_BASE_URL ||
          process.env.YANGO_DOMAIN ||
          DEFAULT_BASE,
      },
      problem: err,
    };
  }
}

async function main(): Promise<void> {
  // Anonymous usage pings (ids/names/versions only, never data or arguments);
  // opt out with ASKADS_TELEMETRY=0. Built before the config so a config
  // problem can be reported; wired to the server before tools register.
  const telemetry = new Telemetry(readVersion());
  const { config, problem } = loadConfigOrDegraded(telemetry);
  const client = new YangoRetailClient(config);

  // Decided once, at startup: the token comes only from the environment, so it
  // cannot change mid-session — an unconfigured start stays unconfigured until
  // the operator sets the variable and restarts the server.
  const connected = Boolean(config.token);

  const server = new McpServer(
    {
      name: "mcp-yango-retail",
      version: readVersion(),
    },
    // Surfaces in the initialize result, ahead of any tool call.
    {
      instructions: connected
        ? INSTRUCTIONS
        : UNCONFIGURED_PREFIX + (problem ? `Configuration problem: ${problem.message} ` : "") + INSTRUCTIONS,
    },
  );

  instrumentToolCalls(server, telemetry);
  server.server.oninitialized = () => {
    telemetry.setClientInfo(server.server.getClientVersion());
    // Split on purpose: `server_start` keeps meaning "a usable install started",
    // so the unconfigured case gets its own event instead of inflating that
    // number. The reason vocabulary is the historical closed set.
    if (connected) telemetry.send("server_start");
    else telemetry.send("unconfigured_start", { reason: problem?.reason ?? "missing_token" });
  };

  registerOrderTools(server, client);
  registerCatalogTools(server, client);
  registerPricingTools(server, client);
  registerStockTools(server, client);
  registerRawTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `mcp-yango-retail running on stdio${
      connected ? "" : " (no YANGO_RETAIL_TOKEN — set the variable and restart)"
    }`,
  );
}

main().catch((err) => {
  console.error("Fatal error starting mcp-yango-retail:", err);
  process.exit(1);
});
