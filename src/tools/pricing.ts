import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { YangoRetailClient } from "../client.js";
import { cursor, decimalString, fail, ok, READ_ONLY, WRITE } from "./util.js";

export function registerPricingTools(server: McpServer, client: YangoRetailClient): void {
  server.registerTool(
    "query_price_lists",
    {
      title: "Query price lists",
      annotations: READ_ONLY,
      description:
        "Cursor-based price-list feed (POST /b2b/v1/pricelists/query) — the API's only way to " +
        "list price lists, so a full snapshot means iterating until a page has fewer items than " +
        "limit. Returns {pricelists: [{id, name, status (active|removed)}], cursor}. Price-list " +
        "ids feed get_prices and set_prices. Related endpoints without a dedicated tool " +
        "(pricelists/get, pricelists/create, store-pricelist-links/*) are reachable via raw_request.",
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
        return ok(await client.queryPriceLists({ cursor: c, limit }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_prices",
    {
      title: "Get prices",
      annotations: READ_ONLY,
      description:
        "Product prices for one or more price lists (POST /b2b/v1/prices/get). Returns " +
        "{results: [{pricelist_id, prices_data: [{product_id, price, price_per_quantity?}]}]}. " +
        "price may arrive as a number or a string — treat it as a decimal either way.",
      inputSchema: {
        pricelist_ids: z
          .array(z.string().min(1))
          .min(1)
          .describe("Price-list ids from query_price_lists."),
      },
    },
    async ({ pricelist_ids }) => {
      try {
        return ok(await client.getPrices(pricelist_ids));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "set_prices",
    {
      title: "Set prices",
      annotations: WRITE,
      description:
        "Sets product prices in price lists (POST /b2b/v1/prices/set), at most 100 per request. " +
        'Prices are decimal STRINGS (e.g. "150.00"); price_per_quantity (pack size the price ' +
        "applies to) defaults to 1 when omitted. The response body is not documented upstream " +
        "(2xx = success) and is returned verbatim. There is no delete endpoint for prices.",
      inputSchema: {
        prices: z
          .array(
            z.object({
              price: decimalString().describe('New price as a decimal string, e.g. "150.00".'),
              pricelist_id: z.string().min(1).describe("Target price list id."),
              product_id: z.string().min(1).describe("Product id the price applies to."),
              price_per_quantity: z
                .number()
                .int()
                .min(1)
                .optional()
                .describe("Quantity the price covers (default 1)."),
            }),
          )
          .min(1)
          .max(100)
          .describe("Price assignments (at most 100 per request)."),
      },
    },
    async ({ prices }) => {
      try {
        return ok(await client.setPrices(prices));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "create_discounts",
    {
      title: "Create discounts",
      annotations: WRITE,
      description:
        "Creates per-store product discounts (POST /b2b/v1/discounts/create), at most 100 per " +
        "request. CAUTION: the exact key names inside discount_activity_period and discount_value " +
        "are NOT documented (the official client types them as plain string→string maps with no " +
        "example) — confirm the expected keys with Yango Tech before relying on this tool, and " +
        "note there is no endpoint to list or delete discounts. The response body is not " +
        "documented upstream (2xx = success) and is returned verbatim.",
      inputSchema: {
        discounts: z
          .array(
            z
              .object({
                product_id: z.string().min(1).describe("Product id the discount applies to."),
                store_id: z.string().min(1).describe("WMS store id from get_stores."),
                discount_activity_period: z
                  .record(z.string())
                  .describe("Activity period map (string→string). Key names are undocumented upstream — passed through verbatim."),
                discount_value: z
                  .record(z.string())
                  .describe("Discount value map (string→string). Key names are undocumented upstream — passed through verbatim."),
              })
              .passthrough(),
          )
          .min(1)
          .max(100)
          .describe("Discounts to create (at most 100 per request)."),
      },
    },
    async ({ discounts }) => {
      try {
        return ok(await client.createDiscounts(discounts));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
