import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

/**
 * Shared zod schema FACTORIES (not shared consts): reusing one zod object
 * across two fields makes zod-to-json-schema dedupe them into a `$ref`
 * (e.g. total_discount → #/properties/total_price), which some tool-schema
 * consumers (OpenAI Apps review) don't dereference and flag as `any`.
 * A fresh object per field keeps each one inlined with its type + pattern.
 */

/** An order id as issued by the retailer (client-side id). */
export const orderId = () =>
  z.string().min(1).describe("The order id (the client-side id the order was created with).");

/** A money/quantity decimal passed as a string, e.g. "150.00" — never a number. */
export const decimalString = () =>
  z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, 'Must be a decimal string, e.g. "150.00"')
    .describe('Decimal as a string, e.g. "150.00". The API never takes money as a JSON number.');

/** An opaque pagination cursor from a previous page of the same feed. */
export const cursor = () =>
  z
    .string()
    .min(1)
    .optional()
    .describe(
      "Opaque cursor from the previous response of this tool. Omit it for the first page; " +
        "the feed is exhausted when a page comes back with fewer items than `limit`.",
    );

/** Wraps a value as a compact-JSON tool result (compact: the consumer is an LLM). */
export function ok(data: unknown): CallToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return { content: [{ type: "text", text: text ?? "null" }] };
}

export function fail(err: unknown): CallToolResult {
  let message = err instanceof Error ? err.message : String(err);
  // Surface the underlying cause (e.g. the network error behind a timeout) — no
  // secrets live in cause, and it makes failures far easier to diagnose.
  if (err instanceof Error && err.cause instanceof Error) message += ` (${err.cause.message})`;
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

/**
 * MCP tool annotations — hints the consuming client can use to gate or label a
 * tool. Yango Tech Retail is a WRITE API (orders, products, prices, discounts
 * and stocks are created or overwritten), so unlike a read-only server every
 * tool picks its annotation consciously:
 *
 *   READ_ONLY   — side-effect-free reads (get/query/state/receipts);
 *   WRITE       — state-changing but not destructive (create/set/update);
 *   DESTRUCTIVE — order cancellation and the raw escape hatch (it can call anything).
 */
// All four hints set explicitly: some clients (OpenAI Apps review) require
// readOnlyHint, destructiveHint and openWorldHint on every tool.
export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export const DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;
