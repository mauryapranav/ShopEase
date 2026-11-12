"use client";
import { useState } from "react";
export default function Login() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign in failed.");
      location.assign("/");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Connection failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="login-layout">
      <section className="login-story">
        <a href="/" className="brand">
          ShopEase<span>●</span>
        </a>
        <div>
          <p className="eyebrow">CUSTOMER SERVICES</p>
          <h1>
            Your ShopEase
            <br />
            account.
          </h1>
          <p>
            Shop your favourites. Keep track of every order.
            <br />
            Get help whenever you need it.
          </p>
        </div>

      </section>
      <section className="login-form">
        <form onSubmit={login}>
          <p className="eyebrow">WORKSHOP DEMO</p>
          <h2>Sign in</h2>
          <p className="muted">
            Enter the shared workshop passcode. Orders and tickets are visible to everyone in this demo.
          </p>
          <label htmlFor="password">Passcode</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
