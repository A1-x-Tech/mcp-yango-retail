import { test } from "node:test";
import assert from "node:assert/strict";
import { registerPricingTools } from "./pricing.js";

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
    queryPriceLists: make("queryPriceLists"),
    getPrices: make("getPrices"),
    setPrices: make("setPrices"),
    createDiscounts: make("createDiscounts"),
  };
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerPricingTools(server as never, client as never);
  return { calls, tools };
}

test("registers the four pricing tools", () => {
  const { tools } = harness();
  assert.deepEqual(Object.keys(tools).sort(), [
    "create_discounts",
    "get_prices",
    "query_price_lists",
    "set_prices",
  ]);
});

test("query_price_lists forwards cursor and limit", async () => {
  const { calls, tools } = harness();
  await tools.query_price_lists({ cursor: "c1", limit: 25 });
  assert.equal(calls[0].method, "queryPriceLists");
  assert.deepEqual(calls[0].params, { cursor: "c1", limit: 25 });
});

test("get_prices forwards the price-list ids", async () => {
  const { calls, tools } = harness();
  await tools.get_prices({ pricelist_ids: ["pl-1", "pl-2"] });
  assert.deepEqual(calls[0], { method: "getPrices", params: ["pl-1", "pl-2"] });
});

test("set_prices forwards the price batch", async () => {
  const { calls, tools } = harness();
  const prices = [{ price: "150.00", pricelist_id: "pl-1", product_id: "p1", price_per_quantity: 2 }];
  await tools.set_prices({ prices });
  assert.deepEqual(calls[0], { method: "setPrices", params: prices });
});

test("create_discounts forwards the discount batch", async () => {
  const { calls, tools } = harness();
  const discounts = [
    {
      product_id: "p1",
      store_id: "st-1",
      discount_activity_period: { begin: "2026-08-10" },
      discount_value: { value: "10" },
    },
  ];
  await tools.create_discounts({ discounts });
  assert.deepEqual(calls[0], { method: "createDiscounts", params: discounts });
});

test("a client error is returned as an isError result, not thrown", async () => {
  const { tools } = harness({ throwOn: "setPrices" });
  const res = await tools.set_prices({
    prices: [{ price: "1.00", pricelist_id: "pl", product_id: "p" }],
  });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /boom/);
});
