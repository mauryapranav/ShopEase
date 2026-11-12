"use client";
import { createContext, useContext, useState, useEffect } from "react";
import type { AgentStep } from "@/lib/agent/types";
export type Message = {
  role: "user" | "model";
  text: string;
  steps?: AgentStep[];
};
export type Chat = {
  messages: Message[];
  input: string;
  loading: boolean;
  error: string;
};
export const emptyChat: Chat = {
  messages: [],
  input: "",
  loading: false,
  error: "",
};
const Context = createContext<{
  chats: Record<string, Chat>;
  update: (id: string, change: (chat: Chat) => Chat) => void;
} | null>(null);
export default function ChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chats, setChats] = useState<Record<string, Chat>>({});
  useEffect(() => {
    for (const [id, chat] of Object.entries(chats)) {
      try {
        sessionStorage.setItem(
          "shopease-chat-v2-" + id,
          JSON.stringify(
            (chat.loading ? chat.messages.slice(0, -1) : chat.messages).slice(
              -100,
            ),
          ),
        );
      } catch {
        /* Navigation still retains in-memory chat when storage is unavailable. */
      }
    }
  }, [chats]);
  function update(id: string, change: (chat: Chat) => Chat) {
    setChats((previous) => {
      const chat = change(previous[id] || emptyChat);
      return { ...previous, [id]: chat };
    });
  }
  return (
    <Context.Provider value={{ chats, update }}>{children}</Context.Provider>
  );
}
export function useChats() {
  const context = useContext(Context);
  if (!context) throw new Error("Chat provider missing");
  return context;
}
