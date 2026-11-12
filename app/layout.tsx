import type { Metadata } from "next";
import "./globals.css";
import "./finish.css";
import "./workspace.css";
import ChatProvider from "@/components/ChatProvider";

// YOUR JOB: change the title and description for your app.
export const metadata: Metadata = {
  title: "ShopEase | Customer support",
  description: "Orders, returns and support for ShopEase customers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen"><ChatProvider>{children}</ChatProvider></body>
    </html>
  );
}
