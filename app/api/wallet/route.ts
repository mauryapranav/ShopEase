import { NextResponse } from "next/server";
import { walletSnapshot } from "@/lib/shop";
export async function GET() {
  try {
    return NextResponse.json(await walletSnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Wallet could not load." },
      { status: 503 },
    );
  }
}
