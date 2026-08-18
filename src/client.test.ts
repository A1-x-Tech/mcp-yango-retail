import { test } from "node:test";
import assert from "node:assert/strict";
import { YangoRetailClient } from "./client.js";
import { CredentialsError, MISSING_TOKEN_MESSAGE } from "./config.js";
import type { YangoRetailConfig } from "./types.js";

const BASE = "https://api.retailtech.yango.com";

type Call = {
  url: string;
  method: string;
  auth: unknown;
  contentType: unknown;
  body: Record<string, unknown> | undefined;
};

function makeConfig(extra: Partial<YangoRetailConfig> = {}): YangoRetailConfig {
  return {
    token: "TKN",
    apiBase: BASE,
    maxRetries: 0,
    retryBaseMs: 0, // no real backoff delay in tests
    ...extra,
  };
}

/** Installs a recording fetch stub and returns a client + the captured calls. */
function harness(extra: Partial<YangoRetailConfig> = {}) {
  const calls: Call[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = (async (
    url: unknown,
    init: { method: string; headers: Record<string, string>; body?: string },
  ) => {
    calls.push({
      url: String(url),
      method: init.method,
      auth: init.headers.Authorization,
      contentType: init.headers["Content-Type"],
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;

  return {
    client: new YangoRetailClient(makeConfig(extra)),
    calls,
    restore: () => {
      globalThis.fetch = orig;
    },
  };
}

// --- Orders ---

test("createOrder: POST to orders/create with Bearer auth and a compacted body", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.createOrder({
      order_id: "o-1",
      cart: { items: [{ product_id: "p1", quantity: 2, price: "150.00" }], total_price: "300.00" },
      payment_type: "online",
      store_id: undefined,
    });
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/orders/create`);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].auth, "Bearer TKN");
  assert.equal(calls[0].contentType, "application/json");
  assert.deepEqual(calls[0].body, {
    order_id: "o-1",
    cart: { items: [{ product_id: "p1", quantity: 2, price: "150.00" }], total_price: "300.00" },
    payment_type: "online",
  });
});

test("cancelOrder sends the reason only when present", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.cancelOrder({ order_id: "o-1", reason: "customer request" });
    await client.cancelOrder({ order_id: "o-2" });
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/orders/cancel`);
  assert.deepEqual(calls[0].body, { order_id: "o-1", reason: "customer request" });
  assert.deepEqual(calls[1].body, { order_id: "o-2" });
});

test("getOrder and getOrdersState use their exact wire bodies", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.getOrder("o-1");
    await client.getOrdersState(["o-1", "o-2"]);
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/orders/get`);
  assert.deepEqual(calls[0].body, { order_id: "o-1" });
  assert.equal(calls[1].url, `${BASE}/b2b/v1/orders/state`);
  assert.deepEqual(calls[1].body, { orders: ["o-1", "o-2"] });
});

test("queryOrderEvents omits the cursor on the first call and passes it later", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.queryOrderEvents();
    await client.queryOrderEvents("cur-1");
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/orders/events/query`);
  assert.deepEqual(calls[0].body, {});
  assert.deepEqual(calls[1].body, { cursor: "cur-1" });
});

test("getReceipt requires exactly one of receipt_id/order_id, before any fetch", async () => {
  const { client, calls, restore } = harness();
  try {
    await assert.rejects(
      () => client.getReceipt({ receipt_id: "r1", order_id: "o1" }),
      /exactly one/,
    );
    await assert.rejects(() => client.getReceipt({}), /required/);
    assert.equal(calls.length, 0, "validation failures must not reach the network");
    await client.getReceipt({ order_id: "o1", client_fields: ["email"] });
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/receipts/get`);
  assert.deepEqual(calls[0].body, { order_id: "o1", client_fields: ["email"] });
});

// --- Catalog / stocks / prices ---

test("getStores sends an empty JSON object by contract", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.getStores();
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/stores/get`);
  assert.deepEqual(calls[0].body, {});
});

test("queryProducts defaults the limit to 300 like the official client", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.queryProducts();
    await client.queryProducts({ cursor: "c1", limit: 50 });
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/products/query`);
  assert.deepEqual(calls[0].body, { limit: 300 });
  assert.deepEqual(calls[1].body, { cursor: "c1", limit: 50 });
});

test("createProducts wraps the batch as {products}", async () => {
  const { client, calls, restore } = harness();
  const product = {
    product_id: "p1",
    master_category: "dairy",
    status: "active",
    is_meta: false,
    custom_attributes: { longName: { en: "Milk" }, markCount: 1, markCountUnitList: "liter" },
  };
  try {
    await client.createProducts([product]);
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/products/create`);
  assert.deepEqual(calls[0].body, { products: [product] });
});

test("queryPriceLists and queryStocks default the limit to 100", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.queryPriceLists();
    await client.queryStocks({ cursor: "s-cur" });
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/pricelists/query`);
  assert.deepEqual(calls[0].body, { limit: 100 });
  assert.equal(calls[1].url, `${BASE}/b2b/v1/stocks/query`);
  assert.deepEqual(calls[1].body, { cursor: "s-cur", limit: 100 });
});

test("getPrices wraps the ids as {pricelist_ids}", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.getPrices(["pl-1", "pl-2"]);
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/prices/get`);
  assert.deepEqual(calls[0].body, { pricelist_ids: ["pl-1", "pl-2"] });
});

test("setPrices defaults price_per_quantity to 1 on the wire", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.setPrices([
      { price: "150.00", pricelist_id: "pl-1", product_id: "p1" },
      { price: "99.90", pricelist_id: "pl-1", product_id: "p2", price_per_quantity: 6 },
    ]);
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/prices/set`);
  assert.deepEqual(calls[0].body, {
    prices: [
      { price: "150.00", pricelist_id: "pl-1", product_id: "p1", price_per_quantity: 1 },
      { price: "99.90", pricelist_id: "pl-1", product_id: "p2", price_per_quantity: 6 },
    ],
  });
});

test("createDiscounts wraps the batch as {discounts}", async () => {
  const { client, calls, restore } = harness();
  const discount = {
    product_id: "p1",
    store_id: "st-1",
    discount_activity_period: { begin: "2026-08-10", end: "2026-08-17" },
    discount_value: { type: "percent", value: "10" },
  };
  try {
    await client.createDiscounts([discount]);
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/discounts/create`);
  assert.deepEqual(calls[0].body, { discounts: [discount] });
});

test("updateStocks: modify hits stocks/update with update_mode, initialize does not", async () => {
  const { client, calls, restore } = harness();
  try {
    await client.updateStocks({ store_id: "st-1", stocks: [{ product_id: "p1", quantity: 5 }] });
    await client.updateStocks({
      store_id: "st-1",
      stocks: [{ product_id: "p1", quantity: 5 }],
      mode: "initialize",
    });
  } finally {
    restore();
  }
  assert.equal(calls[0].url, `${BASE}/b2b/v1/stocks/update`);
  assert.deepEqual(calls[0].body, {
    update_mode: "modify",
    store_id: "st-1",
    stocks: [{ product_id: "p1", quantity: 5 }],
  });
  assert.equal(calls[1].url, `${BASE}/b2b/v1/stocks/initialize`);
  assert.deepEqual(calls[1].body, {
    store_id: "st-1",
    stocks: [{ product_id: "p1", quantity: 5 }],
  });
});

// --- Errors / retry / timeout / SSRF behavior ---

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const original = globalThis.fetch;
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    const i = (init ?? {}) as RequestInit;
    calls.push({ url: String(url), init: i });
    return handler(String(url), i);
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

function makeClient(overrides: Partial<YangoRetailConfig> = {}) {
  return new YangoRetailClient(makeConfig(overrides));
}

test("non-2xx throws YangoRetailError with the raw body and the Yango trace headers", async () => {
  const mock = mockFetch(
    () =>
      new Response("order not found", {
        status: 404,
        headers: { "x-yatraceid": "trace-abc", "x-yarequestid": "req-42" },
      }),
  );
  try {
    await assert.rejects(
      () => makeClient().getOrder("nope"),
      /HTTP 404: order not found \(trace trace-abc, request req-42\)/,
    );
  } finally {
    mock.restore();
  }
});

test("request() retries a 429 even for a non-idempotent write", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) return new Response("rate limited", { status: 429 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  try {
    const result = await makeClient({ maxRetries: 3 }).createOrder({ order_id: "o-1" });
    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    mock.restore();
  }
});

test("request() does NOT retry a 5xx for a non-idempotent write", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    return new Response("boom", { status: 502 });
  });
  try {
    await assert.rejects(() => makeClient({ maxRetries: 3 }).createOrder({ order_id: "o-1" }), /HTTP 502/);
    assert.equal(calls, 1, "a write must not be replayed after a 5xx");
  } finally {
    mock.restore();
  }
});

test("request() retries a 5xx for an idempotent read", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) return new Response("unavailable", { status: 503 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  try {
    const result = await makeClient({ maxRetries: 3 }).getStores();
    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    mock.restore();
  }
});

test("request() retries a network error for reads and rethrows it for writes", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) throw new Error("ECONNRESET");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  try {
    const result = await makeClient({ maxRetries: 3 }).queryProducts();
    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    mock.restore();
  }

  calls = 0;
  const mock2 = mockFetch(() => {
    calls++;
    throw new Error("ECONNRESET");
  });
  try {
    await assert.rejects(
      () => makeClient({ maxRetries: 3 }).setPrices([{ price: "1", pricelist_id: "pl", product_id: "p" }]),
      /ECONNRESET/,
    );
    assert.equal(calls, 1, "a write must not be replayed after a network error");
  } finally {
    mock2.restore();
  }
});

test("request() does not retry a 400 and gives up after maxRetries on 429", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    return new Response("nope", { status: 400 });
  });
  try {
    await assert.rejects(() => makeClient().getOrder("o-1"), /HTTP 400/);
    assert.equal(calls, 1);
  } finally {
    mock.restore();
  }

  calls = 0;
  const mock2 = mockFetch(() => {
    calls++;
    return new Response("slow down", { status: 429 });
  });
  try {
    await assert.rejects(() => makeClient({ maxRetries: 2 }).getOrder("o-1"), /HTTP 429/);
    assert.equal(calls, 3); // initial + 2 retries
  } finally {
    mock2.restore();
  }
});

test("request() aborts and reports a timeout when the request hangs", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = ((_url: unknown, init: unknown) =>
    new Promise((_resolve, reject) => {
      const signal = (init as RequestInit).signal as AbortSignal;
      signal.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
      );
    })) as typeof fetch;
  try {
    const client = makeClient({ timeoutMs: 10, maxRetries: 0 });
    await assert.rejects(() => client.createOrder({ order_id: "o-1" }), /timed out after 10ms/);
  } finally {
    globalThis.fetch = original;
  }
});

// --- Missing credentials (degraded start) ---

// The exact startup-era text, relayed verbatim at call time — pinned so a
// reworded message does not silently change what the model tells the user.
const MISSING_TOKEN_TEXT =
  "YANGO_RETAIL_TOKEN is required (the Bearer token issued by Yango Tech for your retailer " +
  "account; YANGO_AUTH_TOKEN is accepted as an alias).";

test("request() without a token throws CredentialsError; fetch is never called", async () => {
  const mock = mockFetch(() => new Response("{}", { status: 200 }));
  try {
    // maxRetries is deliberately non-zero: zero fetch calls proves the error
    // skips the retry/backoff loop entirely, not just that retries ran out.
    const client = new YangoRetailClient({ apiBase: BASE, maxRetries: 3, retryBaseMs: 0 });
    await assert.rejects(
      () => client.getStores(),
      (err: unknown) => {
        assert.ok(err instanceof CredentialsError, "must be a CredentialsError");
        assert.equal((err as Error).name, "CredentialsError");
        assert.equal((err as Error).message, MISSING_TOKEN_MESSAGE);
        // The historical startup error, verbatim — the message is the product.
        assert.ok(
          (err as Error).message.startsWith(MISSING_TOKEN_TEXT),
          `the message must open with the exact startup text, got: ${(err as Error).message}`,
        );
        assert.match((err as Error).message, /restart the server/, "the fix must mention the restart");
        return true;
      },
    );
    // Not transport trouble: the retry/backoff branch — and fetch itself —
    // must never run for a configuration problem.
    assert.equal(mock.calls.length, 0, "fetch must not be called without a token");
  } finally {
    mock.restore();
  }
});

test("request() rejects an absolute path (SSRF) without fetching", async () => {
  for (const evil of ["https://evil.example/steal", "http://evil.example/x", "\\\\evil.example/x"]) {
    const mock = mockFetch(() => new Response("{}", { status: 200 }));
    try {
      await assert.rejects(() => makeClient().request(evil, {}), /foreign origin/);
      assert.equal(mock.calls.length, 0, `must not fetch for ${JSON.stringify(evil)}`);
    } finally {
      mock.restore();
    }
  }
});

test("request() still accepts relative API paths (with or without a leading slash)", async () => {
  const mock = mockFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  try {
    await makeClient().request("b2b/v1/pricelists/get", { pricelist_ids: ["pl"] });
    await makeClient().request("/b2b/v1/stores/get", {});
    assert.equal(mock.calls[0].url, `${BASE}/b2b/v1/pricelists/get`);
    assert.equal(mock.calls[1].url, `${BASE}/b2b/v1/stores/get`);
  } finally {
    mock.restore();
  }
});

test("a custom apiBase with a trailing slash is normalized", async () => {
  const mock = mockFetch(() => new Response("{}", { status: 200 }));
  try {
    await makeClient({ apiBase: "https://api.tst.example/" }).getStores();
    await makeClient({ apiBase: "https://api.tst.example" }).getStores();
    assert.equal(mock.calls[0].url, "https://api.tst.example/b2b/v1/stores/get");
    assert.equal(mock.calls[1].url, "https://api.tst.example/b2b/v1/stores/get");
  } finally {
    mock.restore();
  }
});
