import { NextResponse } from "next/server";
import { z } from "zod";
import { currentCustomer } from "@/lib/customer";
import { getSupabase } from "@/lib/supabase";
export async function POST(request: Request) {
  const customer = await currentCustomer();
  const parsed = z
    .object({ confirmationId: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid confirmation." },
      { status: 400 },
    );
  const { data, error } = await getSupabase().rpc("shop_confirm_cancellation", {
    p_customer: customer.id,
    p_intent: parsed.data.confirmationId,
  });
  if (error)
    return NextResponse.json(
      {
        error: /expired|shipped|cancelled|not found|unavailable/i.test(
          error.message,
        )
          ? error.message
          : "Cancellation failed. Check the database update.",
      },
      { status: 400 },
    );
  return NextResponse.json(data);
}
