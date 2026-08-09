/**
 * The server talks to the Yango Tech Retail (grocery platform) B2B API at
 * https://api.retailtech.yango.com. Every endpoint lives under /b2b/v1/* and is
 * called with POST + a JSON body — including reads. Auth is a single
 * `Authorization: Bearer <token>` header on every request; the token is issued
 * by Yango Tech for the retailer's account.
 *
 * There is no public first-party docs portal: the official Python client
 * (github.com/yango-tech/yango-tech-grocery-client) is the de-facto spec this
 * server follows. Where that client leaves a shape untyped, this server passes
 * the JSON through verbatim.
 */

/** Known order states reported by orders/state and order events (open-ended). */
export type OrderState =
  | "draft"
  | "canceled"
  | "checked_out"
  | "reserving"
  | "reserved"
  | "postpone_reserving"
  | "postponed"
  | "assembling"
  | "assembled"
  | "delivering"
  | "closed"
  | "pending_cancel"
  | "courier_assigned";

/** Client PII fields that receipts/get can include on demand. */
export type ReceiptClientField = "full_name" | "phone_number" | "email" | "delivery_address";

/** How update_stocks writes quantities: modify (default) or initialize. */
export type StockUpdateMode = "modify" | "initialize";

export interface YangoRetailConfig {
  /** Bearer token issued by Yango Tech. Treated as a secret. */
  token: string;
  /** API root. Defaults to https://api.retailtech.yango.com. */
  apiBase: string;
  /** Per-request timeout in milliseconds. Defaults to 60_000. */
  timeoutMs?: number;
  /** Max retries for transient errors (429 rate limit; 5xx for reads). Defaults to 3. */
  maxRetries?: number;
  /** Base backoff in milliseconds, doubled each retry. Defaults to 500. */
  retryBaseMs?: number;
}

/**
 * A non-2xx response from the Yango Tech Retail API. The API's error body
 * schema is not publicly documented, so the body is kept as parsed-or-raw text;
 * the `x-yatraceid` / `x-yarequestid` response headers are surfaced in the
 * message — include them when reporting a problem to Yango Tech support.
 */
export class YangoRetailError extends Error {
  readonly status: number;
  readonly body?: unknown;
  /** Value of the x-yatraceid response header, when present. */
  readonly traceId?: string;
  /** Value of the x-yarequestid response header, when present. */
  readonly requestId?: string;

  constructor(status: number, body: unknown, ids: { traceId?: string; requestId?: string } = {}) {
    super(`HTTP ${status}: ${formatErrorBody(body)}${formatTraceIds(ids)}`);
    this.name = "YangoRetailError";
    this.status = status;
    this.body = body;
    this.traceId = ids.traceId;
    this.requestId = ids.requestId;
  }
}

/**
 * Turns an error body into a short readable message. The API's error format is
 * undocumented (the official client treats bodies as opaque text), so this only
 * picks up a `message`/`code` pair when one happens to be present and otherwise
 * shows the (truncated) raw body.
 */
function formatErrorBody(body: unknown): string {
  if (body == null) return "(no body)";
  if (typeof body === "string") return body.slice(0, 500) || "(empty body)";
  if (typeof body !== "object") return String(body);
  const obj = body as Record<string, unknown>;
  if (typeof obj.message === "string") {
    const code = obj.code !== undefined ? `[${String(obj.code)}] ` : "";
    return `${code}${obj.message}`.slice(0, 500);
  }
  return JSON.stringify(obj).slice(0, 500);
}

/** Appends the Yango trace/request ids so failures can be reported to support. */
function formatTraceIds(ids: { traceId?: string; requestId?: string }): string {
  const parts: string[] = [];
  if (ids.traceId) parts.push(`trace ${ids.traceId}`);
  if (ids.requestId) parts.push(`request ${ids.requestId}`);
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}
