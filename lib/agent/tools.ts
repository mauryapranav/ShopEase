import "server-only";
import { z } from "zod";
import { defineTool } from "./defineTool";
import { eligibility, getOrder, listOrders } from "../shop";
import { currentCustomer } from "../customer";
import { getSupabase } from "../supabase";

const orderId = z
  .number()
  .int()
  .positive()
  .describe("Order number belonging to this customer");
const item = z.object({
  orderId,
  productId: z
    .string()
    .regex(/^P\d+$/)
    .describe("Product ID from the order items"),
});
export function toolsForChat(history: import("../schemas").ChatMessage[]) {
  return [
    defineTool({
      name: "requestOrderCancellation",
      description:
        "When the customer asks to cancel a specific unshipped order, prepare a confirmation card. This does not cancel the order. Tell the customer to click Confirm cancellation.",
      writes: true,
      schema: z.object({ orderId }),
      run: async ({ orderId }) => {
        const { data, error } = await getSupabase().rpc(
          "shop_request_cancellation",
          { p_customer: (await currentCustomer()).id, p_order: orderId },
        );
        if (error) throw new Error(error.message);
        return data;
      },
    }),
    defineTool({
      name: "getMyOrders",
      description:
        "Find the customer's orders and items when an order number is unknown.",
      schema: z.object({}),
      run: listOrders,
    }),
    defineTool({
      name: "getOrderDetails",
      description: "Look up shipping status, tracking and items for one order.",
      schema: z.object({ orderId }),
      run: ({ orderId }) => getOrder(orderId),
    }),
    defineTool({
      name: "checkReturnEligibility",
      description:
        "Check the delivery date and product policy before requesting a return.",
      schema: item,
      run: ({ orderId, productId }) => eligibility(orderId, productId),
    }),
    defineTool({
      name: "createReturnRequest",
      description:
        "Record a requested return for a specific eligible item using the customer's stated reason.",
      writes: true,
      schema: item.extend({ reason: z.string().trim().min(1).max(500) }),
      run: async ({ orderId, productId, reason }) => {
        const policy = await eligibility(orderId, productId);
        if (!policy.eligible) throw new Error(policy.reason);
        const { data, error } = await getSupabase().rpc("shop_return", {
          p_customer: (await currentCustomer()).id,
          p_order: orderId,
          p_product: productId,
          p_reason: reason,
        });
        if (error)
          throw new Error(
            error.message.includes("return") || error.message.includes("policy")
              ? error.message
              : "Could not save the return. Check the database update.",
          );
        return data;
      },
    }),
    defineTool({
      name: "escalateToHuman",
      description:
        "Open a human support ticket for an unresolved problem or a reported late delivery.",
      writes: true,
      schema: z.object({
        orderId: orderId.optional(),
        issue: z.string().trim().min(1).max(800),
      }),
      run: async ({ orderId, issue }) => {
        if (orderId) await getOrder(orderId);
        const { data, error } = await getSupabase()
          .from("support_tickets")
          .insert({
            customer_id: (await currentCustomer()).id,
            order_id: orderId ?? null,
            issue,
            chat_history: history,
          })
          .select("id,status,order_id")
          .single();
        if (error) throw new Error("Could not save the support ticket.");
        return data;
      },
    }),
  ];
}
