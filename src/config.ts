import type { YangoRetailConfig } from "./types.js";

/** Production API root (the only host present in the official client). */
export const DEFAULT_BASE = "https://api.retailtech.yango.com";

/**
 * A malformed environment variable. Thrown instead of exiting on the spot so
 * index.ts can catch it, report the drop-off and start degraded instead of
 * dying; `reason` is the machine-readable code that ships with that ping
 * (never a variable's value). A *missing* token is NOT a ConfigError — see
 * loadConfig. (No malformed-value checks exist today; the class guards future ones.)
 */
export class ConfigError extends Error {
  readonly reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = "ConfigError";
    this.reason = reason;
  }
}

/**
 * What a tool call without a token reads. The first sentence is the historical
 * startup error, verbatim — the rest exists because the token comes only from
 * the environment, so the fix is an operator action plus a restart, never a
 * retry.
 */
export const MISSING_TOKEN_MESSAGE =
  "YANGO_RETAIL_TOKEN is required (the Bearer token issued by Yango Tech for your retailer " +
  "account; YANGO_AUTH_TOKEN is accepted as an alias). " +
  "This is not a network failure and retrying will not help: the operator must set these " +
  "environment variables in the MCP client's server config and restart the server — they are " +
  "read only at startup.";

/**
 * Raised when a tool call needs the Bearer token and none was configured. The
 * message is the whole point of the class: it is the only text the calling
 * model reads about the missing setup, so it names the fix (which variable to
 * set, and that a restart is needed) instead of describing the failure.
 */
export class CredentialsError extends Error {
  constructor(message: string = MISSING_TOKEN_MESSAGE) {
    super(message);
    this.name = "CredentialsError";
  }
}

/**
 * Builds the client config from environment variables.
 *
 * A missing token is NOT an error here: the server starts anyway and the
 * client raises {@link CredentialsError} on the first tool call, so an
 * unconfigured install completes the MCP handshake and carries the fix into
 * the session instead of dying before `initialize` with nothing to read.
 * There is no in-chat login: the fix is the operator setting the variable and
 * restarting the server.
 *
 *   YANGO_RETAIL_TOKEN         Bearer token issued by Yango Tech
 *                              (YANGO_AUTH_TOKEN is accepted as an alias — it is
 *                              the name the official Python client uses)
 *   YANGO_RETAIL_API_BASE_URL  API root override (aliases: YANGO_API_BASE_URL, and
 *                              YANGO_DOMAIN — the name the official Python client's
 *                              README uses)
 *   YANGO_RETAIL_TIMEOUT_MS    per-request timeout (default 60000)
 *   YANGO_RETAIL_MAX_RETRIES   transient-error retries (default 3)
 */
export function loadConfig(): YangoRetailConfig {
  const timeoutMs = Number(process.env.YANGO_RETAIL_TIMEOUT_MS);
  const maxRetries = Number(process.env.YANGO_RETAIL_MAX_RETRIES);

  return {
    // An empty string reads as absent, never as an empty credential.
    token: process.env.YANGO_RETAIL_TOKEN || process.env.YANGO_AUTH_TOKEN || undefined,
    apiBase:
      process.env.YANGO_RETAIL_API_BASE_URL ||
      process.env.YANGO_API_BASE_URL ||
      process.env.YANGO_DOMAIN ||
      DEFAULT_BASE,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60_000,
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 3,
  };
}
