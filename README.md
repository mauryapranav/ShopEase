# ShopEase · E-commerce Customer Support Agent
PS1 · Retail · SRM workshop

Support chat is the home page. Everyone signs into the same fictional customer account, C001. Shop places one-item mock orders. Tickets, attached conversations, and follow-up notes are visible to everyone with the passcode.

## Run locally

Use Node 24 and run `npm ci`. Fill the ignored .env.local using .env.example. Set DEMO_PASSCODE to the shared login passcode and APP_PASSCODE to a separate private random session-signing secret. Set SUPABASE_URL, SUPABASE_SECRET_KEY and GEMINI_API_KEY. GEMINI_MODEL controls the model on the server. Run `npm run dev`.

## Database and deployment

On an existing PS1 database, run APPLY_SHOPEASE_UPDATE.sql in Supabase SQL Editor. It preserves orders and tickets, installs mock checkout and cancellation, and disables the old refund schedule. On a fresh database only, run seed/00_starter_example.sql and seed/ps1_ecommerce_support.sql first. The original seed resets demo records.

In Vercel, use the Next.js preset and repository root. Set the environment variables for the deployment environment and build the updated commit. Run `npm run typecheck` and `npm run build` locally.

## Demo flows

- Place an order in Shop and open its details from Orders. A repeated checkout request ID resolves to the same order.
- In chat, request a return or cancel a placed order. Cancellation requires one confirmation.
- Raise a ticket directly in Tickets, optionally attaching this browser tab’s conversation. Chat escalation attaches the recent messages sent to the agent. Tickets persist in Supabase, including after sign-out.
- Expand a ticket to read the issue, transcript and follow-up notes. Mark it in progress, close it, or reopen it. Older tickets retain their original issue and status.

## Agent tools
getMyOrders, getOrderDetails, checkReturnEligibility, createReturnRequest, escalateToHuman and requestOrderCancellation. Gemini chooses tools, Zod validates arguments and the server executes Supabase operations with a five-round limit.

## Submission
Fill in team number, members and roles, live URL and demo access details. Every member contributes a commit. Submit repo URL, Vercel URL and five slides using the trainer's form.
