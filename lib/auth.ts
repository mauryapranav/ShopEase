export const SESSION_COOKIE = "shop_session_v2";
export const accounts = [
  { id: "C001", name: "Nitin", username: "nitin", password: "1111" },
  { id: "C002", name: "Pranav", username: "pranav", password: "2222" },
  { id: "C003", name: "Gokul", username: "gokul", password: "3333" },
  { id: "C004", name: "Loki", username: "loki", password: "4444" },
];

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
    const account = accounts.find((account) => account.id === data.customerId);
    return account
      ? { id: account.id, name: account.name, username: account.username }
      : null;
  } catch {
    return null;
  }
}

export async function isValidSession(value: string | undefined) {
  return Boolean(await readSession(value));
}
