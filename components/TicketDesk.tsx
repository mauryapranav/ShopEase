"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { changeTicket, raiseTicket } from "@/app/(store)/tickets/actions";
import type { ChatMessage } from "@/lib/schemas";
import { useChats } from "./ChatProvider";

const labels = { open: "Open", in_progress: "In progress", resolved: "Closed" };
export type Ticket = {
  id: number;
  issue: string;
  status: keyof typeof labels;
  order_id: number | null;
  created_at: string;
  chat_history: ChatMessage[];
  ticket_events: { id: number; body: string; created_at: string }[];
};
const date = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function TicketRecord({ ticket }: { ticket: Ticket }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const pending = useRef({ key: "", id: "" });
  async function update(action: string) {
    const key = action + ":" + note;
    if (key !== pending.current.key)
      pending.current = { key, id: crypto.randomUUID() };
    setBusy(true);
    setFeedback("");
    try {
      await changeTicket({
        id: ticket.id,
        action,
        note,
        requestId: pending.current.id,
      });
      pending.current.key = "";
      setNote("");
      setFeedback("Saved.");
    } catch {
      setFeedback("Could not save. Refresh the ticket and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="ticket-record" id={String(ticket.id)}>
      <summary>
        <span>
          <small>
            Ticket #{ticket.id} · {date(ticket.created_at)}
          </small>
          <strong>{ticket.issue}</strong>
        </span>
        <span className="status-badge">{labels[ticket.status]}</span>
      </summary>
      <div className="ticket-thread">
        {ticket.order_id && (
          <Link className="order-link" href={"/orders/" + ticket.order_id}>
            View order #{ticket.order_id} →
          </Link>
        )}
        <h3>Chat history</h3>
        {ticket.chat_history.length === 0 && (
          <p className="muted">No chat attached.</p>
        )}
        {ticket.chat_history.map((m, i) => (
          <blockquote key={i}>
            <b>{m.role === "model" ? "Assistant" : "Visitor"}</b>
            <p>{m.text}</p>
          </blockquote>
        ))}
        <h3>Ticket activity</h3>
        <p className="muted">{date(ticket.created_at)} · Ticket opened.</p>
        {ticket.ticket_events.map((e) => (
          <blockquote key={e.id}>
            <small>{date(e.created_at)}</small>
            <p>{e.body}</p>
          </blockquote>
        ))}
        {ticket.status !== "resolved" && (
          <label>
            Follow-up note
            <textarea
              maxLength={1500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        )}
        <div className="ticket-controls">
          {ticket.status !== "resolved" && (
            <button
              disabled={busy || !note.trim()}
              onClick={() => update("note")}
            >
              Add note
            </button>
          )}
          {ticket.status === "open" && (
            <button disabled={busy} onClick={() => update("start")}>
              Mark in progress
            </button>
          )}
          <button
            disabled={busy}
            onClick={() =>
              update(ticket.status === "resolved" ? "reopen" : "close")
            }
          >
            {ticket.status === "resolved" ? "Reopen ticket" : "Close ticket"}
          </button>
        </div>
        <p role="status">{busy ? "Saving…" : feedback}</p>
      </div>
    </details>
  );
}
export default function TicketDesk({
  customerId,
  tickets,
}: {
  customerId: string;
  tickets: Ticket[];
}) {
  const [issue, setIssue] = useState("");
  const [filter, setFilter] = useState("all");
  const [attach, setAttach] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [stored, setStored] = useState<ChatMessage[]>([]);
  const pending = useRef("");
  const { chats } = useChats();
  const history = chats[customerId]?.messages || stored;
  useEffect(() => {
    try {
      const chat = JSON.parse(
        sessionStorage.getItem("shopease-demo-chat-" + customerId) || "[]",
      );
      if (Array.isArray(chat))
        setStored(
          chat.filter(
            (m) =>
              m &&
              typeof m.text === "string" &&
              (m.role === "user" || m.role === "model"),
          ),
        );
    } catch {
      /* The form also works without an attached chat. */
    }
    const selected = document.getElementById(location.hash.slice(1));
    if (selected instanceof HTMLDetailsElement) selected.open = true;
  }, [customerId]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback("");
    pending.current ||= crypto.randomUUID();
    try {
      const id = await raiseTicket({
        issue,
        requestId: pending.current,
        history: attach
          ? history
              .slice(-100)
              .map(({ role, text }) => ({ role, text: text.slice(0, 4000) }))
          : [],
      });
      pending.current = "";
      setIssue("");
      setAttach(false);
      setFilter("all");
      setFeedback("Ticket #" + id + " opened.");
    } catch {
      setFeedback("Could not raise ticket. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const visible = tickets.filter(
    (t) => filter === "all" || t.status === filter,
  );
  return (
    <div className="ticket-desk">
      <form onSubmit={submit} className="detail-panel">
        <h2>Raise a ticket</h2>
        <label>
          Describe the issue
          <textarea
            required
            maxLength={800}
            value={issue}
            onChange={(e) => {
              pending.current = "";
              setIssue(e.target.value);
            }}
          />
        </label>
        {history.length > 0 && (
          <label className="attach-chat">
            <input
              type="checkbox"
              checked={attach}
              onChange={(e) => {
                pending.current = "";
                setAttach(e.target.checked);
              }}
            />{" "}
            Attach this support chat
          </label>
        )}
        <p className="muted">
          Tickets and attached messages are shared with everyone using this
          demo.
        </p>
        <button className="primary" disabled={busy || !issue.trim()}>
          {busy ? "Opening…" : "Raise ticket"}
        </button>
        <p role="status">{feedback}</p>
      </form>
      <section>
        <div className="ticket-filter">
          <h2>Ticket history</h2>
          <select
            aria-label="Filter tickets by status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {visible.map((t) => (
          <TicketRecord key={t.id} ticket={t} />
        ))}
        {!visible.length && (
          <div className="empty-record">
            No tickets {filter === "all" ? "yet" : "with this status"}.
          </div>
        )}
      </section>
    </div>
  );
}
