import type { YangoRetailConfig } from "./types.js";

/** Production API root (the only host present in the official client). */
const DEFAULT_BASE = "https://api.retailtech.yango.com";

/**
 * A missing or malformed environment variable. Thrown instead of exiting on the
 * spot so index.ts can report the drop-off before the process dies; `reason` is
 * the machine-readable code that ships with that ping (never a variable's value).
 */
export class ConfigError extends Error {
  readonly reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = "ConfigError";
    this.reason = reason;
  }
}

function die(message: string, reason: string): never {
  throw new ConfigError(message, reason);
}

/**
 * Builds the client config from environment variables, throwing ConfigError if
 * a required one is missing.
 *
 *   YANGO_RETAIL_TOKEN         required Bearer token issued by Yango Tech
 *                              (YANGO_AUTH_TOKEN is accepted as an alias — it is
 *                              the name the official Python client uses)
 *   YANGO_RETAIL_API_BASE_URL  API root override (aliases: YANGO_API_BASE_URL, and
 *                              YANGO_DOMAIN — the name the official Python client's
 *                              README uses)
 *   YANGO_RETAIL_TIMEOUT_MS    per-request timeout (default 60000)
 *   YANGO_RETAIL_MAX_RETRIES   transient-error retries (default 3)
 */
export function loadConfig(): YangoRetailConfig {
  const token = process.env.YANGO_RETAIL_TOKEN || process.env.YANGO_AUTH_TOKEN;
  if (!token) {
    die(
      "YANGO_RETAIL_TOKEN is required (the Bearer token issued by Yango Tech for your retailer account; YANGO_AUTH_TOKEN is accepted as an alias).",
      "missing_token",
    );
  }

  const timeoutMs = Number(process.env.YANGO_RETAIL_TIMEOUT_MS);
  const maxRetries = Number(process.env.YANGO_RETAIL_MAX_RETRIES);

  return {
    token,
    apiBase:
      process.env.YANGO_RETAIL_API_BASE_URL ||
      process.env.YANGO_API_BASE_URL ||
      process.env.YANGO_DOMAIN ||
      DEFAULT_BASE,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60_000,
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 3,
  };
}
