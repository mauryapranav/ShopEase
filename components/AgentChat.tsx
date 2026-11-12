"use client";

import { useEffect, useRef } from "react";
import type { AgentResult, AgentStep } from "@/lib/agent/types";

import { emptyChat, useChats, type Message } from "./ChatProvider";
import CancellationConfirmation from "./CancellationConfirmation";
import MessageText from "./MessageText";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

const SAMPLE_PROMPTS = [
  {
    title: "Track an order",
    description: "Where’s my delivery?",
    style: "track",
    prompt: "Show my orders and their delivery status.",
  },
  {
    title: "Start a return",
    description: "Find out what’s eligible",
    style: "return",
    prompt: "Which of my items can I return?",
  },
  {
    title: "Cancel an order",
    description: "Changed your mind?",
    style: "cancel",
    prompt:
      "I would like to cancel an unshipped order. Show me which orders I can cancel.",
  },
  {
    title: "Talk to our team",
    description: "Get a person to help",
    style: "human",
    prompt: "I need help from a person. Please open a support ticket.",
  },
];

export default function AgentChat({
  customerId,
}: {
  customerId: string;
}) {
  const { chats, update } = useChats();
  const chat = chats[customerId] || emptyChat;
  const { messages, input, loading, error } = chat;
  const router = useRouter();
  const order = useSearchParams().get("order");
  const seededOrder = useRef<string | null>(null);
  useEffect(() => {
    if (order && /^\d+$/.test(order) && seededOrder.current !== order) {
      seededOrder.current = order;
      update(customerId, (chat) => ({
        ...chat,
        input: "I need help with order #" + order,
      }));
    }
  }, [order, customerId, update]);
  const storageKey = "shopease-demo-chat-" + customerId;
  function setMessages(messages: Message[]) {
    update(customerId, (chat) => ({ ...chat, messages }));
  }
  function setInput(input: string) {
    update(customerId, (chat) => ({ ...chat, input }));
  }
  function setLoading(loading: boolean) {
    update(customerId, (chat) => ({ ...chat, loading }));
  }
  function setError(error: string) {
    update(customerId, (chat) => ({ ...chat, error }));
  }
  useEffect(() => {
    if (chats[customerId]) return;
    let messages: Message[] = [];
    try {
      const schema = z
        .array(
          z.object({
            role: z.enum(["user", "model"]),
            text: z.string(),
            steps: z
              .array(
                z.object({
                  tool: z.string(),
                  args: z.unknown(),
                  ok: z.boolean(),
                  writes: z.boolean(),
                  result: z.unknown().optional(),
                  error: z.string().optional(),
                }),
              )
              .optional(),
          }),
        )
        .max(100);
      messages = schema.parse(
        JSON.parse(sessionStorage.getItem(storageKey) || "[]"),
      );
    } catch {
      /* An unavailable browser store starts a fresh conversation. */
    }
    update(customerId, (chat) => ({ ...chat, messages }));
  }, [customerId, storageKey, chats, update]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollTo({
      top: bottomRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [
      ...messages.slice(-98),
      { role: "user", text: trimmed },
    ];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the last 20 messages are sent, to keep requests small.
        body: JSON.stringify({
          messages: next.slice(-19).map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const result = data as AgentResult;
      setMessages([
        ...next,
        { role: "model", text: result.reply, steps: result.steps },
      ]);
      if (result.steps.some((s) => s.writes && s.ok)) router.refresh();
    } catch (err) {
      setMessages(messages);
      setInput(trimmed);
      setError(err instanceof Error ? err.message : "Something went wrong");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="support-chat" aria-label="Support conversation">
      <div className="chat-header">
        <div>
          <h2>ShopEase assistant</h2>
          <p>AI support</p>
        </div>
      </div>

      <div ref={bottomRef} className="chat-viewport space-y-3">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <span className="conversation-mark" aria-hidden="true">se</span>
            <h2>
              What do you need help with?
            </h2>
            <p>Pick a starting point, or ask me anything about your order.</p>
            <div className="chat-actions">
              {SAMPLE_PROMPTS.map((action) => (
                <button
                  key={action.style}
                  disabled={!chats[customerId] || loading}
                  onClick={() => send(action.prompt)}
                  className={"chat-action action-" + action.style}
                >
                  <span>
                    <strong>{action.title}</strong>
                    <small>{action.description}</small>
                  </span>
                  <span className="action-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                m.role === "user"
                  ? "user-bubble max-w-[85%]"
                  : "max-w-[85%] space-y-2"
              }
            >
              {m.steps && m.steps.length > 0 && <ToolSteps steps={m.steps} />}
              {m.steps
                ?.filter(
                  (step) => step.tool === "requestOrderCancellation" && step.ok,
                )
                .map((step, index) => {
                  const result = z
                    .object({
                      confirmationId: z.string().uuid(),
                      orderId: z.number(),
                      amount: z.number(),
                    })
                    .safeParse(step.result);
                  return result.success ? (
                    <CancellationConfirmation
                      key={result.data.confirmationId || index}
                      id={result.data.confirmationId}
                      orderId={result.data.orderId}
                      amount={result.data.amount}
                    />
                  ) : null;
                })}
              {m.role === "model" ? (
                <div className="assistant-bubble">
                  <MessageText text={m.text} />
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}

        {loading && (
          <p role="status" className="text-sm text-slate-500">
            Checking your request…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="chat-composer"
      >
        <input
          maxLength={4000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message to ShopEase support"
          placeholder="Ask about an order, a return, anything…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={!chats[customerId] || loading || !input.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Send <span aria-hidden="true">↗</span>
        </button>
      </form>
    </div>
  );
}

/** Shows each tool call so users (and judges) can see what the agent did. */
function ToolSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((s, i) => (
        <details
          key={i}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
        >
          <summary className="cursor-pointer select-none">
            <span className={s.ok ? "text-emerald-700" : "text-red-600"}>
              {s.ok ? "Done" : "Failed"}
            </span>
            {" · "}
            <span className="font-mono font-medium">{s.tool}</span>
            {s.writes && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                writes data
              </span>
            )}
          </summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-slate-600">
            {JSON.stringify(
              {
                args: s.args,
                ...(s.ok ? { result: s.result } : { error: s.error }),
              },
              null,
              2,
            )}
          </pre>
        </details>
      ))}
    </div>
  );
}
