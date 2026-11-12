"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  return_window_days: number;
};
const photos: Record<string, string> = {
  Footwear: "photo-1542291026-7eec264c27ff",
  Clothing: "photo-1521572163474-6864f9cf17ab",
  Electronics: "photo-1505740420928-5e560c06d30e",
  "Home & Kitchen": "photo-1602143407151-7111542de6e8",
  Bags: "photo-1553062407-98eeb64c6a62",
  Sports: "photo-1518611012118-696072aa579a",
  Stationery: "photo-1531346878377-a5be20888e57",
  Beauty: "photo-1556229010-6c3f2c9ca5f8",
  Books: "photo-1544947950-fa07a98d237f",
};
export default function Catalog({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef<Record<string, string>>({});
  const router = useRouter();
  async function buy(product: Product) {
    if (busy) return;
    setBusy(product.id);
    setMessage("");
    pending.current[product.id] ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          requestId: pending.current[product.id],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) delete pending.current[product.id];
        throw new Error(data.error || "Purchase failed.");
      }
      delete pending.current[product.id];
      setMessage(
        "Order #" +
          data.order_id +
          " placed for " +
          product.name +
          ".",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Connection failed. Try again.",
      );
    } finally {
      setBusy("");
    }
  }
  const visible = products.filter(
    (product) =>
      (category === "All" || category === product.category) &&
      product.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section id="catalog">
      <div className="collection-heading">
        <div>
          <h2>Shop all products</h2>
        </div>
        <input
          aria-label="Search products"
          type="search"
          placeholder="Search the collection"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="categories">
        {["All", ...new Set(products.map((product) => product.category))].map(
          (name) => (
            <button
              key={name}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ),
        )}
      </div>
      {message && (
        <div role="status" className="notice">
          {message} <Link href="/orders">View orders</Link>
        </div>
      )}
      <p className="muted result-count">{visible.length} products</p>
      <div className="product-grid">
        {visible.map((product) => (
          <article key={product.id} className="product-card">
            <div className="product-photo">
              <img
                loading="lazy"
                src={
                  "https://images.unsplash.com/" +
                  (photos[product.category] || photos.Books) +
                  "?w=500&auto=format&fit=crop"
                }
                alt={product.category + " collection inspiration"}
              />
              <span>{product.category}</span>
            </div>
            <div className="product-content">
              <h3>{product.name}</h3>
              <p className="muted">
                {product.return_window_days > 0
                  ? product.return_window_days + "-day return window"
                  : "Returns unavailable"}
              </p>
              <div className="product-bottom">
                <strong>
                  ₹{Number(product.price).toLocaleString("en-IN")}
                </strong>
                <button disabled={Boolean(busy)} onClick={() => buy(product)}>
                  {busy === product.id ? "Placing…" : "Place order"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <p className="notice">
          No products match your search. Try a different name or category.
        </p>
      )}
    </section>
  );
}
