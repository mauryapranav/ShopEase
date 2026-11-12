export const SESSION_COOKIE = "shop_session_demo_v1";
export const demoCustomer = { id: "C001", name: "Demo customer" };

async function signingKey() {
  const secret = process.env.APP_PASSCODE?.trim();
  if (!secret)
    throw new Error("Set APP_PASSCODE to a private session signing secret.");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(customerId: string) {
  const payload = btoa(
    JSON.stringify({
      customerId,
      expires: Date.now() + 43200000,
      nonce: crypto.randomUUID(),
    }),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(payload),
  );
  return (
    payload +
    "." +
    Array.from(new Uint8Array(signature), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("")
  );
}

export async function readSession(value: string | undefined) {
  if (!value) return null;
  try {
    const [payload, signature, extra] = value.split(".");
    if (extra || !/^[a-f0-9]{64}$/.test(signature ?? "")) return null;
    const bytes = Uint8Array.from(signature.match(/../g)!, (value) =>
      parseInt(value, 16),
    );
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        await signingKey(),
        bytes,
        new TextEncoder().encode(payload),
      ))
    )
      return null;
    const data = JSON.parse(atob(payload));
    if (typeof data.expires !== "number" || data.expires <= Date.now())
      return null;
    return data.customerId === demoCustomer.id ? demoCustomer : null;
  } catch {
    return null;
  }
}

export async function isValidSession(value: string | undefined) {
  return Boolean(await readSession(value));
}
