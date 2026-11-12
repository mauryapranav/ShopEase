"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function WalletLive({
  initial,
}: {
  initial: { balance: number; pending: number };
}) {
  const [wallet, setWallet] = useState(initial);
  const router = useRouter();
  useEffect(() => {
    setWallet(initial);
  }, [initial]);
  useEffect(() => {
    if (!wallet.pending) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json();
        setWallet(next);
        if (!next.pending) router.refresh();
      } catch {
        /* The database job continues if the browser loses its connection. */
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [wallet.pending, router]);
  return (
    <span className="wallet" role="status">
      Wallet ₹{wallet.balance.toLocaleString("en-IN")}
      {wallet.pending > 0 && <small> · Refund pending</small>}
    </span>
  );
}
