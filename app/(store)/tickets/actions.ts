"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentCustomer } from "@/lib/customer";
import { getSupabase } from "@/lib/supabase";
import { chatMessageSchema } from "@/lib/schemas";

const create = z.object({
  issue: z.string().trim().min(1).max(800),
  history: z.array(chatMessageSchema).max(100),
  requestId: z.string().uuid(),
});
export async function raiseTicket(input: z.infer<typeof create>) {
  const { id } = await currentCustomer();
  const { issue, history, requestId } = create.parse(input);
  const db = getSupabase();
  const { error } = await db.from("support_tickets").insert({
    customer_id: id,
    issue,
    chat_history: history,
    request_id: requestId,
  });
  if (error && error.code !== "23505")
    throw new Error("Could not save ticket.");
  const result = await db
    .from("support_tickets")
    .select("id")
    .eq("customer_id", id)
    .eq("request_id", requestId)
    .single();
  if (result.error) throw new Error("Could not load ticket.");
  revalidatePath("/tickets");
  revalidatePath("/");
  return Number(result.data.id);
}
export async function changeTicket(input: {
  id: number;
  action: string;
  note: string;
  requestId: string;
}) {
  const customer = await currentCustomer();
  const args = z
    .object({
      id: z.number().int().positive(),
      action: z.enum(["note", "start", "close", "reopen"]),
      note: z.string().max(1500),
      requestId: z.string().uuid(),
    })
    .parse(input);
  const { error } = await getSupabase().rpc("shop_update_ticket", {
    p_customer: customer.id,
    p_ticket: args.id,
    p_action: args.action,
    p_note: args.note,
    p_request: args.requestId,
  });
  if (error) throw new Error("Could not update ticket.");
  revalidatePath("/tickets");
  revalidatePath("/");
}
