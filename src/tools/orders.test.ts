import { test } from "node:test";
import assert from "node:assert/strict";
import { registerOrderTools } from "./orders.js";

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
    createOrder: make("createOrder"),
    cancelOrder: make("cancelOrder"),
    getOrder: make("getOrder"),
    getOrdersState: make("getOrdersState"),
    queryOrderEvents: make("queryOrderEvents"),
    getReceipt: make("getReceipt"),
  };
  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  registerOrderTools(server as never, client as never);
  return { calls, tools };
}

test("registers the six order tools", () => {
  const { tools } = harness();
  assert.deepEqual(Object.keys(tools).sort(), [
    "cancel_order",
    "create_order",
    "get_order",
    "get_orders_state",
    "get_receipt",
    "query_order_events",
  ]);
});

test("create_order forwards the whole order body", async () => {
  const { calls, tools } = harness();
  const args = {
    order_id: "o-1",
    cart: { items: [{ product_id: "p1", quantity: 1, price: "10.00" }], total_price: "10.00" },
    payment_type: "cash",
    store_id: "st-1",
  };
  await tools.create_order(args);
  assert.equal(calls[0].method, "createOrder");
  assert.deepEqual(calls[0].params, args);
});

test("cancel_order forwards order_id and reason", async () => {
  const { calls, tools } = harness();
  await tools.cancel_order({ order_id: "o-1", reason: "oos" });
  assert.equal(calls[0].method, "cancelOrder");
  assert.deepEqual(calls[0].params, { order_id: "o-1", reason: "oos" });
});

test("get_order forwards the id as a plain string", async () => {
  const { calls, tools } = harness();
  await tools.get_order({ order_id: "o-9" });
  assert.deepEqual(calls[0], { method: "getOrder", params: "o-9" });
});

test("get_orders_state forwards the id list", async () => {
  const { calls, tools } = harness();
  await tools.get_orders_state({ orders: ["o-1", "o-2"] });
  assert.deepEqual(calls[0], { method: "getOrdersState", params: ["o-1", "o-2"] });
});

test("query_order_events forwards the cursor (or undefined)", async () => {
  const { calls, tools } = harness();
  await tools.query_order_events({});
  await tools.query_order_events({ cursor: "cur-1" });
  assert.deepEqual(calls[0], { method: "queryOrderEvents", params: undefined });
  assert.deepEqual(calls[1], { method: "queryOrderEvents", params: "cur-1" });
});

test("get_receipt forwards the one-of lookup and client_fields", async () => {
  const { calls, tools } = harness();
  await tools.get_receipt({ order_id: "o-1", client_fields: ["email", "phone_number"] });
  assert.equal(calls[0].method, "getReceipt");
  assert.deepEqual(calls[0].params, {
    receipt_id: undefined,
    order_id: "o-1",
    client_fields: ["email", "phone_number"],
  });
});

test("a client error is returned as an isError result, not thrown", async () => {
  const { tools } = harness({ throwOn: "createOrder" });
  const res = await tools.create_order({ order_id: "o-1" });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /boom/);
});
