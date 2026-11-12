"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CancellationConfirmation({
  id,
  orderId,
  amount,
}: {
  id: string;
  orderId: number;
  amount: number;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  async function confirm() {
    if (busy || done) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationId: id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cancellation failed.");
      setDone(true);
      setStatus(
        "Order #" +
          orderId +
          " cancelled. ₹" +
          Number(data.amount).toLocaleString("en-IN") +
          " will return to your wallet in 1–2 minutes.",
      );
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Connection failed. Retry to check this cancellation.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cancellation-confirmation">
      {!done && (
        <>
          <strong>Cancel order #{orderId}?</strong>
          <p>
            Refund of ₹{Number(amount).toLocaleString("en-IN")} to your wallet
            in 1–2 minutes after confirmation.
          </p>
          <button className="primary" disabled={busy} onClick={confirm}>
            {busy ? "Cancelling…" : "Confirm cancellation"}
          </button>
        </>
      )}
      {status && <p role="status">{status}</p>}
    </div>
  );
}
