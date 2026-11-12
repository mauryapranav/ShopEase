import { NextResponse } from "next/server";
import { z } from "zod";
import { accounts, createSession, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  username: z.string().trim().toLowerCase().max(40),
  password: z.string().max(100),
});
export async function POST(request: Request) {
  if (!process.env.APP_PASSCODE?.trim()) {
    return NextResponse.json(
      {
        error: "Set APP_PASSCODE in the server environment before signing in.",
      },
      { status: 503 },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const account =
    parsed.success &&
    accounts.find(
      (account) =>
        account.username === parsed.data.username &&
        account.password === parsed.data.password,
    );
  if (!account)
    return NextResponse.json(
      { error: "Username or password is incorrect." },
      { status: 401 },
    );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSession(account.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 43200,
  });
  return response;
}
