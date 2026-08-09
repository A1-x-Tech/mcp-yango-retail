import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { YangoRetailClient } from "../client.js";
import { cursor, decimalString, DESTRUCTIVE, fail, ok, orderId, READ_ONLY, WRITE } from "./util.js";

/** Known order states (open-ended upstream; used in descriptions only). */
const ORDER_STATES =
  "draft, checked_out, reserving, reserved, postpone_reserving, postponed, assembling, " +
  "assembled, courier_assigned, delivering, closed, pending_cancel, canceled";

export function registerOrderTools(server: McpServer, client: YangoRetailClient): void {
  server.registerTool(
    "create_order",
    {
      title: "Create an order",
      annotations: WRITE,
      description:
        "Creates an order on the Yango Tech platform (POST /b2b/v1/orders/create). You supply the " +
        "order_id; the same body shape is used by the platform for order updates. All money fields " +
        'are decimal STRINGS (e.g. "150.00"), never numbers. The response body is not documented ' +
        "upstream and is returned verbatim. After creation, track progress with get_orders_state " +
        "(get_order does NOT return the state).",
      inputSchema: {
        order_id: z.string().min(1).describe("Client-side order id (you choose it; reuse it in the other order tools)."),
        cart: z
          .object({
            items: z
              .array(
                z
                  .object({
                    product_id: z.string().min(1).describe("Product id from the catalog."),
                    quantity: z.number().int().min(1).describe("Units of the product."),
                    price: decimalString().describe('Price per unit as a decimal string, e.g. "150.00".'),
                    discount: decimalString().optional().describe("Discount amount for the line, decimal string."),
                    vat: decimalString().optional().describe('VAT rate/amount for the line as a decimal string, e.g. "20".'),
                  })
                  .passthrough(),
              )
              .min(1)
              .describe("Cart lines."),
            total_price: decimalString().describe("Cart total, decimal string."),
            total_delivery: decimalString().optional().describe("Delivery fee total, decimal string."),
            total_discount: decimalString().optional().describe("Discount total, decimal string."),
            total_package: decimalString().optional().describe("Packaging fee total, decimal string."),
            total_promo: decimalString().optional().describe("Promo total, decimal string."),
            total_vat: decimalString().optional().describe("VAT total, decimal string."),
          })
          .passthrough()
          .optional()
          .describe("Shopping cart: items plus totals (all money as decimal strings)."),
        client_phone_number: z.string().optional().describe("Customer phone number in international format."),
        courier_pin: z.string().optional().describe("PIN the courier must present on handover."),
        delivery_address: z
          .object({
            position: z
              .object({
                lat: z.number().describe("Latitude."),
                lon: z.number().describe("Longitude."),
              })
              .describe("Delivery point coordinates {lat, lon} — required inside delivery_address."),
            address: z
              .object({
                city: z.string().optional().describe("City."),
                country: z.string().optional().describe("Country."),
                house: z.string().optional().describe("House number."),
                street: z.string().optional().describe("Street."),
              })
              .passthrough()
              .optional()
              .describe("Structured address parts."),
            comment: z.string().optional().describe("Comment for the courier."),
          })
          .passthrough()
          .optional()
          .describe("Delivery address: coordinates plus optional structured address and comment."),
        payment_type: z
          .string()
          .optional()
          .describe("Payment type. Known values: cash, online, card, apple_pay, loyalty (the list is open-ended)."),
        store_id: z.string().optional().describe("WMS store (darkstore) id from get_stores."),
        use_external_logistics: z
          .boolean()
          .optional()
          .describe("true — delivery is handled by external (3PL) logistics instead of the platform."),
        delivery_properties: z
          .object({
            type: z.string().describe("Delivery type identifier (open-ended string)."),
            slot: z
              .object({
                start: z.string().describe("Slot start timestamp."),
                end: z.string().describe("Slot end timestamp."),
              })
              .optional()
              .describe("Delivery time slot."),
          })
          .passthrough()
          .optional()
          .describe("Delivery properties: type and optional {start, end} slot."),
        human_order_id: z.string().optional().describe("Human-readable order number shown to the customer."),
      },
    },
    async (order) => {
      try {
        return ok(await client.createOrder(order));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "cancel_order",
    {
      title: "Cancel an order",
      annotations: DESTRUCTIVE,
      description:
        "Cancels an existing order (POST /b2b/v1/orders/cancel). Optionally pass a reason. The " +
        "response body is not documented upstream and is returned verbatim; verify the outcome " +
        "with get_orders_state (expect canceled or pending_cancel).",
      inputSchema: {
        order_id: orderId(),
        reason: z.string().optional().describe("Free-form cancellation reason."),
      },
    },
    async ({ order_id, reason }) => {
      try {
        return ok(await client.cancelOrder({ order_id, reason }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_order",
    {
      title: "Get order details",
      annotations: READ_ONLY,
      description:
        "Details of a single order (POST /b2b/v1/orders/get): every field the order was created " +
        "with (cart, delivery_address, payment_type, store_id, …) plus create_time. NOTE: the " +
        "response does NOT include the order state — use get_orders_state for tracking.",
      inputSchema: {
        order_id: orderId(),
      },
    },
    async ({ order_id }) => {
      try {
        return ok(await client.getOrder(order_id));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_orders_state",
    {
      title: "Get order states (batch)",
      annotations: READ_ONLY,
      description:
        "Batch order tracking (POST /b2b/v1/orders/state). Returns " +
        "{query_results: [{order_id, query_result, state?}]} — query_result reports per-order " +
        "lookup success (an unknown id is reported here, not as an HTTP error). Known states: " +
        `${ORDER_STATES} (the list is open-ended).`,
      inputSchema: {
        orders: z
          .array(z.string().min(1))
          .min(1)
          .describe("Order ids to check (client-side ids used at creation)."),
      },
    },
    async ({ orders }) => {
      try {
        return ok(await client.getOrdersState(orders));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "query_order_events",
    {
      title: "Poll the order event feed",
      annotations: READ_ONLY,
      description:
        "Cursor-based order event feed (POST /b2b/v1/orders/events/query): new orders, state " +
        "changes and issued receipts. Returns {cursor, orders_events: [{order_id, occurred, " +
        "data: {type, …}}]} where data.type is state_change (with current_state), new_order, or " +
        "receipt_issued (with receipt_id). Omit cursor for the first call, then keep passing the " +
        "returned cursor — the feed is continuous, so poll again later with the last cursor.",
      inputSchema: {
        cursor: cursor(),
      },
    },
    async ({ cursor: c }) => {
      try {
        return ok(await client.queryOrderEvents(c));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_receipt",
    {
      title: "Get fiscal receipts",
      annotations: READ_ONLY,
      description:
        "Fiscal receipt(s) by receipt id OR order id (POST /b2b/v1/receipts/get) — pass exactly " +
        "one of the two. Returns {receipts: [{receipt_id, order, create_time, store, receipt_type " +
        "(payment|refund), payment_methods, items, client?}]}; items is a map keyed by item id, " +
        "and all amounts are decimal strings. Client PII (full_name, phone_number, email, " +
        "delivery_address) is included only for the fields you list in client_fields.",
      inputSchema: {
        receipt_id: z
          .string()
          .min(1)
          .optional()
          .describe("Receipt id (e.g. from a receipt_issued order event). Mutually exclusive with order_id."),
        order_id: z
          .string()
          .min(1)
          .optional()
          .describe("Order id to fetch receipts for. Mutually exclusive with receipt_id."),
        client_fields: z
          .array(z.enum(["full_name", "phone_number", "email", "delivery_address"]))
          .optional()
          .describe("Which client PII fields to include in the response (omitted = no PII)."),
      },
    },
    async ({ receipt_id, order_id, client_fields }) => {
      try {
        return ok(await client.getReceipt({ receipt_id, order_id, client_fields }));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
