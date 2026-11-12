import { NextResponse } from "next/server";
import { z } from "zod";
import { currentCustomer } from "@/lib/customer";
import { getSupabase } from "@/lib/supabase";
const schema = z.object({
  productId: z.string().regex(/^P\d+$/),
  requestId: z.string().uuid(),
});
export async function POST(request: Request) {
  const customer = await currentCustomer();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid purchase request." },
      { status: 400 },
    );
  const { data, error } = await getSupabase().rpc("shop_mock_purchase", {
    p_customer: customer.id,
    p_product: parsed.data.productId,
    p_request: parsed.data.requestId,
  });
  if (error) {
    const expected = [
      "Product unavailable",
    ];
    const message = expected.find((message) => error.message.includes(message));
    return NextResponse.json(
      {
        error:
          message ||
          "Purchase could not complete. Check the database update, then retry.",
      },
      { status: message ? 400 : 503 },
    );
  }
  return NextResponse.json(data);
}
