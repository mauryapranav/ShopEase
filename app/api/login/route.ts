import { NextResponse } from "next/server";
import { z } from "zod";
import { demoCustomer, createSession, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  passcode: z.string().max(100),
});
export async function POST(request: Request) {
  const passcode = process.env.DEMO_PASSCODE?.trim();
  if (!passcode || !process.env.APP_PASSCODE?.trim()) {
    return NextResponse.json(
      {
        error: "Set DEMO_PASSCODE and APP_PASSCODE in the server environment before signing in.",
      },
      { status: 503 },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.passcode !== passcode)
    return NextResponse.json(
      { error: "Incorrect passcode." },
      { status: 401 },
    );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSession(demoCustomer.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 43200,
  });
  return response;
}
