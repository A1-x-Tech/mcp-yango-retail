import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { YangoRetailClient } from "../client.js";
import { cursor, fail, ok, READ_ONLY, WRITE } from "./util.js";

export function registerCatalogTools(server: McpServer, client: YangoRetailClient): void {
  server.registerTool(
    "get_stores",
    {
      title: "List stores",
      annotations: READ_ONLY,
      description:
        "All stores (darkstores) of the retailer (POST /b2b/v1/stores/get, no parameters). " +
        "Returns {stores: [{id, status, location: {lat, lon}, address?, name?}]}. The store id " +
        "is the WMS store id used by create_order, update_stocks and create_discounts; status " +
        "values are not enumerated upstream.",
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await client.getStores());
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "query_products",
    {
      title: "Query the product catalog",
      annotations: READ_ONLY,
      description:
        "Cursor-based product catalog / product-updates feed (POST /b2b/v1/products/query). " +
        "Returns {products, cursor}; iterate until a page has fewer items than limit to build a " +
        "full snapshot. Each product: {product_id, master_category, status " +
        "(active|disabled|archived), is_meta, custom_attributes}. custom_attributes carries " +
        "localized maps (longName, shortNameLoc, descriptionLoc: {lang: text}), markCount + " +
        "markCountUnitList (unit/gram/kilogram/liter/millilitre — open-ended), barcode[], " +
        "images[], typeAccounting (byUnit|byWeight|byTrueWeight) and arbitrary extra attributes.",
      inputSchema: {
        cursor: cursor(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Page size (default 300 — the official client's value; the server-side maximum is undocumented)."),
      },
    },
    async ({ cursor: c, limit }) => {
      try {
        return ok(await client.queryProducts({ cursor: c, limit }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "create_products",
    {
      title: "Create or update products",
      annotations: WRITE,
      description:
        "Creates (or upserts) products in the catalog (POST /b2b/v1/products/create), at most 100 " +
        "per request. Each product uses the same shape query_products returns: {product_id, " +
        "master_category, status, is_meta, custom_attributes}. custom_attributes must include " +
        "longName ({lang: text}), shortNameLoc, markCount and markCountUnitList; extra keys are " +
        "passed through. The response body is not documented upstream (2xx = success) and is " +
        "returned verbatim.",
      inputSchema: {
        products: z
          .array(
            z
              .object({
                product_id: z.string().min(1).describe("Unique product id."),
                master_category: z.string().describe("Master category id/path the product belongs to."),
                status: z
                  .enum(["active", "disabled", "archived"])
                  .describe("Product lifecycle status."),
                is_meta: z.boolean().describe("true for meta (virtual/grouping) products."),
                custom_attributes: z
                  .record(z.any())
                  .describe(
                    "Attribute map. Required by the platform: longName ({lang: text}), shortNameLoc " +
                      "({lang: text}), markCount (number), markCountUnitList (unit/gram/kilogram/liter/" +
                      "millilitre — open-ended). Optional: barcode (string[]), images (string[]), " +
                      "descriptionLoc, nomenclatureType, typeAccounting (byUnit|byWeight|byTrueWeight), " +
                      "trueMark, mercury, plus arbitrary extra attributes.",
                  ),
              })
              .passthrough(),
          )
          .min(1)
          .max(100)
          .describe("Products to create/upsert (at most 100 per request)."),
      },
    },
    async ({ products }) => {
      try {
        return ok(await client.createProducts(products));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
