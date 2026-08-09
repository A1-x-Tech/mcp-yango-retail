import type { ReceiptClientField, StockUpdateMode, YangoRetailConfig } from "./types.js";
import { YangoRetailError } from "./types.js";

/**
 * Every Yango Tech Retail endpoint is a POST with a JSON body — including
 * reads. There are no GET endpoints, so this is the only method the client
 * (and raw_request) will ever send.
 */
export type HttpMethod = "POST";

/** All endpoints live under this prefix (see the official client's endpoints.py). */
const B2B = "b2b/v1/";

/** Page size the official client uses for products/query. */
const PRODUCTS_LIMIT = 300;
/** Page size the official client uses for pricelists/query and stocks/query. */
const DEFAULT_LIMIT = 100;

export interface RequestOptions {
  /**
   * Safe to retry on 5xx/network errors. Every endpoint is a POST here, so the
   * usual "retry GETs" rule does not apply: side-effect-free reads
   * (orders/get, orders/state, stores/get, the query feeds, prices/get,
   * receipts/get) are idempotent; writes (orders/create|cancel,
   * products/create, prices/set, discounts/create, stocks/update|initialize)
   * are NOT — a 502 after the write commits could duplicate or reapply it.
   * 429 is always retried. Defaults to false.
   */
  idempotent?: boolean;
}

/** One price assignment for prices/set. */
export interface PriceItem {
  /** Decimal string, e.g. "150.00". */
  price: string;
  pricelist_id: string;
  product_id: string;
  /** Pack size the price applies to; the API default is 1. */
  price_per_quantity?: number;
}

/** One stock line for stocks/update and stocks/initialize. */
export interface StockItem {
  product_id: string;
  quantity: number;
}

/** One per-store product discount for discounts/create. */
export interface DiscountItem {
  product_id: string;
  store_id: string;
  /** Key names are not documented by the client — passed through verbatim. */
  discount_activity_period: Record<string, string>;
  discount_value: Record<string, string>;
}

export interface GetReceiptParams {
  receipt_id?: string;
  order_id?: string;
  client_fields?: ReceiptClientField[];
}

export interface CursorPageParams {
  cursor?: string;
  limit?: number;
}

export interface UpdateStocksParams {
  store_id: string;
  stocks: StockItem[];
  /** modify (default) hits stocks/update; initialize hits stocks/initialize. */
  mode?: StockUpdateMode;
}

export class YangoRetailClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;

  constructor(private readonly config: YangoRetailConfig) {
    this.base = config.apiBase.endsWith("/") ? config.apiBase : config.apiBase + "/";
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseMs = config.retryBaseMs ?? 500;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.token}`,
      "Content-Type": "application/json",
    };
  }

  /** Backoff before a retry: honors Retry-After when present, else exponential (capped at 30s). */
  private backoffMs(attempt: number, res?: Response): number {
    const retryAfter = res ? Number(res.headers.get("Retry-After")) : NaN;
    if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter, 30) * 1000;
    return Math.min(this.retryBaseMs * 2 ** attempt, 30_000);
  }

  /**
   * fetch with an AbortController timeout. Reads the response body inside the
   * guarded zone so the timeout also covers a slow or drip-feeding body, not
   * just the initial headers, and returns the text alongside the response.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    label: string,
  ): Promise<{ res: Response; text: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      return { res, text };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request to "${label}" timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Low-level POST to a Yango Tech Retail path (e.g. "b2b/v1/orders/get").
   * Retries 429 always; 5xx and network errors/timeouts only for idempotent
   * requests (see {@link RequestOptions.idempotent}); any other non-2xx throws
   * a {@link YangoRetailError} carrying the x-yatraceid/x-yarequestid headers.
   */
  async request<T = unknown>(
    path: string,
    body: Record<string, unknown> = {},
    opts: RequestOptions = {},
  ): Promise<T> {
    // Resolve the path against the API base, then reject anything that escaped
    // to a foreign origin (an absolute "https://evil/x" or a "\\evil/x" slipped
    // through raw_request) so the Bearer token can never leak to another host.
    const url = new URL(path.replace(/^\//, ""), this.base);
    if (url.origin !== new URL(this.base).origin) {
      throw new Error(`raw_request path must be a relative API path (resolved to foreign origin ${url.origin})`);
    }
    const target = url.toString();

    const idempotent = opts.idempotent ?? false;

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      let text: string;
      try {
        ({ res, text } = await this.fetchWithTimeout(
          target,
          {
            method: "POST",
            headers: this.headers(),
            body: JSON.stringify(body),
          },
          path,
        ));
      } catch (err) {
        // Network error or timeout: retry idempotent requests with backoff; on
        // the last attempt (or a non-idempotent write) rethrow the original error.
        if (idempotent && attempt < this.maxRetries) {
          await delay(this.backoffMs(attempt));
          continue;
        }
        throw err;
      }

      const transient = res.status === 429 || (idempotent && res.status >= 500 && res.status < 600);
      if (transient && attempt < this.maxRetries) {
        await delay(this.backoffMs(attempt, res));
        continue;
      }

      let data: unknown = undefined;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!res.ok) {
        throw new YangoRetailError(res.status, data, {
          traceId: res.headers.get("x-yatraceid") ?? undefined,
          requestId: res.headers.get("x-yarequestid") ?? undefined,
        });
      }
      return data as T;
    }
  }

  // --- Orders ----------------------------------------------------------------

  /** Creates an order. The response shape is untyped upstream — passed through. */
  async createOrder(order: Record<string, unknown>): Promise<unknown> {
    return this.request(B2B + "orders/create", compact(order));
  }

  /** Cancels an order, optionally with a reason. */
  async cancelOrder(p: { order_id: string; reason?: string }): Promise<unknown> {
    return this.request(B2B + "orders/cancel", compact({ order_id: p.order_id, reason: p.reason }));
  }

  /** Order details (all creation fields + create_time). Does NOT include the state. */
  async getOrder(orderId: string): Promise<unknown> {
    return this.request(B2B + "orders/get", { order_id: orderId }, { idempotent: true });
  }

  /** Batch state check: {query_results: [{order_id, query_result, state?}]}. */
  async getOrdersState(orderIds: string[]): Promise<unknown> {
    return this.request(B2B + "orders/state", { orders: orderIds }, { idempotent: true });
  }

  /** Cursor-based order event feed (new orders, state changes, receipts issued). */
  async queryOrderEvents(cursor?: string): Promise<unknown> {
    return this.request(B2B + "orders/events/query", compact({ cursor }), { idempotent: true });
  }

  /**
   * Fiscal receipt(s) by receipt id or order id. The API requires exactly one
   * of the two, so the mismatch is rejected here before any network call.
   */
  async getReceipt(p: GetReceiptParams): Promise<unknown> {
    if (p.receipt_id && p.order_id) {
      throw new Error("Pass exactly one of receipt_id or order_id, not both.");
    }
    if (!p.receipt_id && !p.order_id) {
      throw new Error("One of receipt_id or order_id is required.");
    }
    return this.request(
      B2B + "receipts/get",
      compact({ receipt_id: p.receipt_id, order_id: p.order_id, client_fields: p.client_fields }),
      { idempotent: true },
    );
  }

  // --- Catalog ----------------------------------------------------------------

  /** All stores (darkstores) of the retailer. The body is empty by contract. */
  async getStores(): Promise<unknown> {
    return this.request(B2B + "stores/get", {}, { idempotent: true });
  }

  /** Cursor-based product catalog feed. Default page size mirrors the official client (300). */
  async queryProducts(p: CursorPageParams = {}): Promise<unknown> {
    return this.request(
      B2B + "products/query",
      compact({ cursor: p.cursor, limit: p.limit ?? PRODUCTS_LIMIT }),
      { idempotent: true },
    );
  }

  /** Creates (or upserts) up to 100 products per request. */
  async createProducts(products: Array<Record<string, unknown>>): Promise<unknown> {
    return this.request(B2B + "products/create", { products });
  }

  // --- Prices and discounts ----------------------------------------------------

  /** Cursor-based price-list feed (the API's only way to list price lists). */
  async queryPriceLists(p: CursorPageParams = {}): Promise<unknown> {
    return this.request(
      B2B + "pricelists/query",
      compact({ cursor: p.cursor, limit: p.limit ?? DEFAULT_LIMIT }),
      { idempotent: true },
    );
  }

  /** Product prices for one or more price lists. */
  async getPrices(pricelistIds: string[]): Promise<unknown> {
    return this.request(B2B + "prices/get", { pricelist_ids: pricelistIds }, { idempotent: true });
  }

  /** Sets up to 100 prices per request; price_per_quantity defaults to 1 on the wire. */
  async setPrices(prices: PriceItem[]): Promise<unknown> {
    return this.request(B2B + "prices/set", {
      prices: prices.map((p) => ({
        price: p.price,
        pricelist_id: p.pricelist_id,
        product_id: p.product_id,
        price_per_quantity: p.price_per_quantity ?? 1,
      })),
    });
  }

  /** Creates up to 100 per-store product discounts per request. */
  async createDiscounts(discounts: DiscountItem[]): Promise<unknown> {
    return this.request(B2B + "discounts/create", { discounts: discounts as unknown as Record<string, unknown>[] });
  }

  // --- Stocks -----------------------------------------------------------------

  /** Cursor-based stock feed across stores. */
  async queryStocks(p: CursorPageParams = {}): Promise<unknown> {
    return this.request(
      B2B + "stocks/query",
      compact({ cursor: p.cursor, limit: p.limit ?? DEFAULT_LIMIT }),
      { idempotent: true },
    );
  }

  /**
   * Writes stock quantities for a store. mode=modify (default) POSTs
   * stocks/update with update_mode "modify"; mode=initialize POSTs
   * stocks/initialize (whose body carries no update_mode field).
   */
  async updateStocks(p: UpdateStocksParams): Promise<unknown> {
    const stocks = p.stocks.map((s) => ({ product_id: s.product_id, quantity: s.quantity }));
    if (p.mode === "initialize") {
      return this.request(B2B + "stocks/initialize", { store_id: p.store_id, stocks });
    }
    return this.request(B2B + "stocks/update", {
      update_mode: "modify",
      store_id: p.store_id,
      stocks,
    });
  }
}

/** Drops keys whose value is `undefined` so they are not sent to the API. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
