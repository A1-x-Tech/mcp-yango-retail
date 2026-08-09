import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { YangoRetailClient } from "../client.js";
import { cursor, fail, ok, READ_ONLY, WRITE } from "./util.js";

/** Known shelf types (open-ended upstream; used in descriptions only). */
const SHELF_TYPES =
  "store, markdown, incoming, out, trash, lost, found, office, parcel, parcel_returned, " +
  "collection, cargo, repacking, review, kitchen_on_demand, kitchen_components, kitchen_trash, " +
  "kitchen_lost, kitchen_found";

export function registerStockTools(server: McpServer, client: YangoRetailClient): void {
  server.registerTool(
    "query_stocks",
    {
      title: "Query stock levels",
      annotations: READ_ONLY,
      description:
        "Cursor-based stock feed across stores (POST /b2b/v1/stocks/query). Returns " +
        "{stocks: [{product_id, quantity, shelf_type, store_id}], cursor}; iterate until a page " +
        "has fewer items than limit for a full snapshot. Known shelf_type values (open-ended): " +
        `${SHELF_TYPES}. Sellable stock normally lives on shelf_type "store".`,
      inputSchema: {
        cursor: cursor(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Page size (default 100 — the official client's value; the server-side maximum is undocumented)."),
      },
    },
    async ({ cursor: c, limit }) => {
      try {
        return ok(await client.queryStocks({ cursor: c, limit }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "update_stocks",
    {
      title: "Update stock quantities",
      annotations: WRITE,
      description:
        "Writes stock quantities for one store. mode=modify (default) POSTs /b2b/v1/stocks/update " +
        "with update_mode \"modify\" (at most 1000 items per request); mode=initialize POSTs " +
        "/b2b/v1/stocks/initialize for the first-time stock load of a store. The response body is " +
        "not documented upstream (2xx = success) and is returned verbatim. Verify the result with " +
        "query_stocks.",
      inputSchema: {
        store_id: z.string().min(1).describe("WMS store id from get_stores."),
        stocks: z
          .array(
            z.object({
              product_id: z.string().min(1).describe("Product id."),
              quantity: z.number().int().min(0).describe("New quantity (integer units)."),
            }),
          )
          .min(1)
          .max(1000)
          .describe("Stock lines to write (at most 1000 per request)."),
        mode: z
          .enum(["modify", "initialize"])
          .optional()
          .describe("modify (default) — regular stock update; initialize — first-time stock load of a store."),
      },
    },
    async ({ store_id, stocks, mode }) => {
      try {
        return ok(await client.updateStocks({ store_id, stocks, mode }));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
