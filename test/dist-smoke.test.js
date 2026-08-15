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

/**
 * The degraded-start contract: without a token the binary used to exit(1)
 * before the handshake, leaving the client a dead server and no reason. It
 * must now start, list every tool, open the instructions with the fix, and
 * answer a tool call with the actionable error — offline: the CredentialsError
 * fires before any fetch, so this test never touches the network.
 */
test("dist bin starts without a token: handshake, tool list, actionable call error", async () => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");

  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => value !== undefined && !key.startsWith("YANGO_"),
    ),
  );
  env.ASKADS_TELEMETRY = "0"; // keep the suite offline

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    env,
  });
  const client = new Client({ name: "dist-smoke-unconfigured", version: "0.0.0" });
  await client.connect(transport);
  try {
    // The model must read the fix before it picks a tool.
    const instructions = client.getInstructions() ?? "";
    assert.match(instructions, /not connected/);
    assert.match(instructions, /YANGO_RETAIL_TOKEN/);
    assert.match(instructions, /restart/);

    const res = await client.listTools();
    assert.deepEqual(res.tools.map((t) => t.name).sort(), ALL_TOOLS);

    // A tool call fails with the exact message instead of killing the server.
    const result = await client.callTool({ name: "get_stores", arguments: {} });
    assert.equal(result.isError, true);
    const text = result.content.map((c) => c.text ?? "").join(" ");
    assert.match(text, /YANGO_RETAIL_TOKEN is required \(the Bearer token issued by Yango Tech/);
    assert.match(text, /restart the server/);
  } finally {
    await client.close();
  }
});
