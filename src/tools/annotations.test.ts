import { test } from "node:test";
import assert from "node:assert/strict";
import { registerCatalogTools } from "./catalog.js";
import { registerOrderTools } from "./orders.js";
import { registerPricingTools } from "./pricing.js";
import { registerRawTool } from "./raw.js";
import { registerStockTools } from "./stocks.js";
import { DESTRUCTIVE, READ_ONLY, WRITE } from "./util.js";

interface Annotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/** Registers every tool against a fake server, capturing each tool's annotations. */
function collectAnnotations(): Record<string, Annotations | undefined> {
  const annotations: Record<string, Annotations | undefined> = {};
  const server = {
    registerTool: (name: string, cfg: { annotations?: Annotations }) => {
      annotations[name] = cfg.annotations;
    },
  };
  // Registration reads the client only inside handlers, so a stub is fine here.
  registerOrderTools(server as never, {} as never);
  registerCatalogTools(server as never, {} as never);
  registerPricingTools(server as never, {} as never);
  registerStockTools(server as never, {} as never);
  registerRawTool(server as never, {} as never);
  return annotations;
}

const ANN = collectAnnotations();

/**
 * Yango Tech Retail is a write API, so this is a per-tool map, not a single
 * invariant: reads are READ_ONLY, state-changing calls are WRITE and the order
 * cancellation (plus the raw escape hatch) is DESTRUCTIVE. Adding a tool means
 * adding it here consciously.
 */
const EXPECTED: Record<string, Annotations> = {
  create_order: WRITE,
  cancel_order: DESTRUCTIVE,
  get_order: READ_ONLY,
  get_orders_state: READ_ONLY,
  query_order_events: READ_ONLY,
  get_receipt: READ_ONLY,
  get_stores: READ_ONLY,
  query_products: READ_ONLY,
  create_products: WRITE,
  query_price_lists: READ_ONLY,
  get_prices: READ_ONLY,
  set_prices: WRITE,
  create_discounts: WRITE,
  query_stocks: READ_ONLY,
  update_stocks: WRITE,
  raw_request: DESTRUCTIVE,
};

test("registers all sixteen tools with annotations", () => {
  assert.deepEqual(Object.keys(ANN).sort(), Object.keys(EXPECTED).sort());
  for (const [name, a] of Object.entries(ANN)) {
    assert.ok(a, `${name} is missing annotations`);
  }
});

test("every tool carries its expected hints, all four set explicitly", () => {
  for (const [name, expected] of Object.entries(EXPECTED)) {
    assert.deepEqual(ANN[name], expected, `${name} annotations drifted`);
  }
});

test("no read-only tool is marked destructive and vice versa", () => {
  for (const [name, a] of Object.entries(ANN)) {
    if (a?.readOnlyHint) {
      assert.equal(a.destructiveHint, false, `${name}: a read cannot be destructive`);
      assert.equal(a.idempotentHint, true, `${name}: re-reading yields the same result`);
    } else {
      assert.equal(a?.idempotentHint, false, `${name}: writes are not idempotent for the client`);
    }
    assert.equal(a?.openWorldHint, true, `${name} should set openWorldHint`);
  }
});
