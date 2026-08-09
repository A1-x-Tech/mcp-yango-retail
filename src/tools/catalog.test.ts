import { test } from "node:test";
import assert from "node:assert/strict";
import { registerCatalogTools } from "./catalog.js";

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
    getStores: make("getStores"),
    queryProducts: make("queryProducts"),
    createProducts: make("createProducts"),
  };
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerCatalogTools(server as never, client as never);
  return { calls, tools };
}

test("registers the three catalog tools", () => {
  const { tools } = harness();
  assert.deepEqual(Object.keys(tools).sort(), ["create_products", "get_stores", "query_products"]);
});

test("get_stores takes no parameters", async () => {
  const { calls, tools } = harness();
  await tools.get_stores({});
  assert.equal(calls[0].method, "getStores");
  assert.deepEqual(calls[0].params, [], "getStores is called with no arguments");
});

test("query_products forwards cursor and limit", async () => {
  const { calls, tools } = harness();
  await tools.query_products({ cursor: "c1", limit: 50 });
  assert.equal(calls[0].method, "queryProducts");
  assert.deepEqual(calls[0].params, { cursor: "c1", limit: 50 });
});

test("create_products forwards the product batch", async () => {
  const { calls, tools } = harness();
  const products = [
    {
      product_id: "p1",
      master_category: "dairy",
      status: "active",
      is_meta: false,
      custom_attributes: { longName: { en: "Milk" }, markCount: 1, markCountUnitList: "liter" },
    },
  ];
  await tools.create_products({ products });
  assert.equal(calls[0].method, "createProducts");
  assert.deepEqual(calls[0].params, products);
});

test("a client error is returned as an isError result, not thrown", async () => {
  const { tools } = harness({ throwOn: "queryProducts" });
  const res = await tools.query_products({});
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /boom/);
});
