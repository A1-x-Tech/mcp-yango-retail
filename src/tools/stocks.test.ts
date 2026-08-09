import { test } from "node:test";
import assert from "node:assert/strict";
import { registerStockTools } from "./stocks.js";

type Args = Record<string, unknown>;
type Handler = (args: Args) => Promise<{ content: { text: string }[]; isError?: boolean }>;

/** Fake server + fake client so the tool handlers run without network. */
function harness(opts: { throwOn?: string } = {}) {
  const calls: { method: string; params: unknown }[] = [];
  const make =
    (method: string) =>
    async (...params: unknown[]) => {
      calls.push({ method, params: params.length === 1 ? params[0] : params });
      if (opts.throwOn === method) throw new Error("boom");
      return { ok: true };
    };
  const client = {
    queryStocks: make("queryStocks"),
    updateStocks: make("updateStocks"),
  };
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerStockTools(server as never, client as never);
  return { calls, tools };
}

test("registers the two stock tools", () => {
  const { tools } = harness();
  assert.deepEqual(Object.keys(tools).sort(), ["query_stocks", "update_stocks"]);
});

test("query_stocks forwards cursor and limit", async () => {
  const { calls, tools } = harness();
  await tools.query_stocks({ cursor: "c1", limit: 10 });
  assert.equal(calls[0].method, "queryStocks");
  assert.deepEqual(calls[0].params, { cursor: "c1", limit: 10 });
});

test("update_stocks forwards store, lines and mode", async () => {
  const { calls, tools } = harness();
  await tools.update_stocks({
    store_id: "st-1",
    stocks: [{ product_id: "p1", quantity: 3 }],
    mode: "initialize",
  });
  assert.equal(calls[0].method, "updateStocks");
  assert.deepEqual(calls[0].params, {
    store_id: "st-1",
    stocks: [{ product_id: "p1", quantity: 3 }],
    mode: "initialize",
  });
});

test("update_stocks defaults the mode to undefined (client applies modify)", async () => {
  const { calls, tools } = harness();
  await tools.update_stocks({ store_id: "st-1", stocks: [{ product_id: "p1", quantity: 3 }] });
  assert.deepEqual(calls[0].params, {
    store_id: "st-1",
    stocks: [{ product_id: "p1", quantity: 3 }],
    mode: undefined,
  });
});

test("a client error is returned as an isError result, not thrown", async () => {
  const { tools } = harness({ throwOn: "updateStocks" });
  const res = await tools.update_stocks({
    store_id: "st-1",
    stocks: [{ product_id: "p1", quantity: 3 }],
  });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /boom/);
});
