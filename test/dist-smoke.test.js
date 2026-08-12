import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { YangoRetailClient } from "../dist/client.js";
import { registerCatalogTools } from "../dist/tools/catalog.js";
import { registerOrderTools } from "../dist/tools/orders.js";
import { registerPricingTools } from "../dist/tools/pricing.js";
import { registerRawTool } from "../dist/tools/raw.js";
import { registerStockTools } from "../dist/tools/stocks.js";

const ALL_TOOLS = [
  "cancel_order",
  "create_discounts",
  "create_order",
  "create_products",
  "get_order",
  "get_orders_state",
  "get_prices",
  "get_receipt",
  "get_stores",
  "query_order_events",
  "query_price_lists",
  "query_products",
  "query_stocks",
  "raw_request",
  "set_prices",
  "update_stocks",
];

test("dist client rejects foreign-origin paths before sending the Bearer token", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };

  const client = new YangoRetailClient({
    token: "SECRET",
    apiBase: "https://api.retailtech.yango.com",
    timeoutMs: 1000,
    maxRetries: 0,
  });

  await assert.rejects(
    () => client.request("https://example.invalid/steal", {}),
    /foreign origin/,
  );
  assert.equal(called, false);
});

test("dist registers the full tool set", () => {
  const names = [];
  const server = {
    registerTool(name) {
      names.push(name);
    },
  };
  const client = {};

  registerOrderTools(server, client);
  registerCatalogTools(server, client);
  registerPricingTools(server, client);
  registerStockTools(server, client);
  registerRawTool(server, client);

  assert.deepEqual(names.sort(), ALL_TOOLS);
});

test("dist bin completes an MCP handshake over stdio and lists every tool", async () => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    env: {
      ...process.env,
      YANGO_RETAIL_TOKEN: "smoke-test-token",
      ASKADS_TELEMETRY: "0",
    },
  });
  const client = new Client({ name: "dist-smoke", version: "0.0.0" });
  await client.connect(transport);
  try {
    const res = await client.listTools();
    assert.deepEqual(res.tools.map((t) => t.name).sort(), ALL_TOOLS);
    // The handshake reported the real server identity.
    const server = client.getServerVersion();
    assert.equal(server?.name, "mcp-yango-retail");
    // ...and the instructions the calling model reads before picking a tool.
    const instructions = client.getInstructions();
    assert.equal(typeof instructions, "string");
    assert.ok(instructions.length > 0, "initialize result carries no instructions");
    assert.match(instructions, /Yango Tech Retail/);
  } finally {
    await client.close();
  }
});
