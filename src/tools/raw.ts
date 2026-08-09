import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { YangoRetailClient } from "../client.js";
import { DESTRUCTIVE, fail, ok } from "./util.js";

export function registerRawTool(server: McpServer, client: YangoRetailClient): void {
  server.registerTool(
    "raw_request",
    {
      title: "Raw Yango Tech Retail API call",
      // The retail API has write endpoints and this tool can reach any of
      // them, so it carries the most conservative annotation.
      annotations: DESTRUCTIVE,
      description:
        "Escape hatch: direct call to any Yango Tech Retail B2B endpoint — for paths without a " +
        "dedicated tool (orders/update, receipts/documents/upload, wms/picking/set-state, " +
        "logistics/delivery/set-state, products-vat/*, pricelists/get|create, " +
        "store-pricelist-links/*, 3pl/deliveries/*). Every endpoint of this API is a POST with a " +
        "JSON body; pass a relative path like \"b2b/v1/pricelists/get\" and the body object. " +
        "CAUTION: this tool can perform writes; 5xx/network errors are never retried for it.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .describe('Relative API path, e.g. "b2b/v1/pricelists/get". Absolute URLs are rejected (SSRF guard).'),
        body: z
          .record(z.any())
          .optional()
          .describe("JSON request body (defaults to {} — the API expects a JSON object on every call)."),
      },
    },
    async ({ path, body }) => {
      try {
        return ok(await client.request(path, body ?? {}));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
