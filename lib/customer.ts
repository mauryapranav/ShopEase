import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, SESSION_COOKIE } from "./auth";

export async function currentCustomer() {
  const account = await readSession(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!account) redirect("/login");
  return account;
}
