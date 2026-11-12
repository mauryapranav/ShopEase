"use client";
import { useState } from "react";
export default function Login() {
  const [username, setUsername] = useState("nitin");
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
        body: JSON.stringify({ username, password }),
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
          <p className="eyebrow">EVERYDAY FINDS</p>
          <h1>
            A little something
            <br />
            for your everyday.
          </h1>
          <p>
            Shop your favourites. Keep track of every order.
            <br />
            Get help whenever you need it.
          </p>
        </div>
        <p>Shopping made simple.</p>
      </section>
      <section className="login-form">
        <form onSubmit={login}>
          <p className="eyebrow">YOUR SHOPEASE ACCOUNT</p>
          <h2>Welcome back.</h2>
          <p className="muted">
            Sign in to shop with your ₹1,000 starter wallet.
          </p>
          <label htmlFor="username">Username</label>
          <select
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          >
            {["nitin", "pranav", "gokul", "loki"].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <label htmlFor="password">Password</label>
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
