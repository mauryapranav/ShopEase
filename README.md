# ShopEase · E-commerce Customer Support Agent
PS1 · Retail · SRM workshop

The home page is the support agent. Customers can read their orders, request eligible returns, open human support tickets and cancel unshipped orders with one explicit confirmation. Shop is a secondary catalogue with one-item wallet checkout.

## Run locally
Use Node 24. Run npm ci. Fill the existing ignored .env.local with GEMINI_API_KEY, GEMINI_MODEL, SUPABASE_URL, SUPABASE_SECRET_KEY and APP_PASSCODE. APP_PASSCODE is a private session signing secret. Use a long random value. Run npm run dev.

## Existing Supabase database
Copy the entire APPLY_SHOPEASE_UPDATE.sql into Supabase SQL Editor and Run as postgres. It updates the existing PS1 tables, gives each new wallet ₹1,000 once, installs the cancellation/refund functions and schedules a refund job. Repeat runs preserve wallet balances. Confirm shopease-wallet-refunds is active in Integrations > Cron and inspect job history if refunds are delayed.

The update assumes seed/ps1_ecommerce_support.sql has already been run. For a fresh database run seed/00_starter_example.sql, then seed/ps1_ecommerce_support.sql, then APPLY_SHOPEASE_UPDATE.sql. The PS1 seed resets its demo records when rerun.

## Accounts
| Username | Password | Customer |
| --- | --- | --- |
| nitin | 1111 | C001 |
| pranav | 2222 | C002 |
| gokul | 3333 | C003 |
| loki | 4444 | C004 |

These intentionally weak credentials are for the fictional workshop demo. Existing C001-C004 orders are assigned to the corresponding accounts. Sessions use signed HTTP-only cookies with 12-hour expiry. Rotating APP_PASSCODE invalidates sessions.

## Behaviour
- Each customer sees their own orders, returns, tickets and wallet. Agent tools get identity from the server session.
- Chat survives navigation, including replies finishing on another page. Completed messages also survive reload in the same browser tab. Chats are separate per account and browser-local.
- Checkout locks the wallet and creates the order and item in one database transaction. Retried request IDs do not charge twice.
- Return creation checks ownership, delivery and each product's return window in the database. Requested returns do not immediately credit the wallet.
- Cancellation requires a confirmation card inside chat. The order is rechecked on confirmation. Only placed orders qualify.
- Cancellation queues one refund per order, due after 60 seconds. Supabase Cron processes due refunds every minute, normally crediting in 1–2 minutes. The wallet also checks due refunds while a refund is pending. Cron continues while the browser is closed.
- Dates use India time. Category photos are illustrative collection imagery.
- Navigation retains the shared shell, prefetches routes and displays loading indicators. Wallet and ticket queries stream independently from the chat.
- Order references in assistant replies and explicit arrow links open /orders/[id]. Detail pages recheck customer ownership.

## Agent tools
getMyOrders, getOrderDetails, checkReturnEligibility, createReturnRequest, escalateToHuman and requestOrderCancellation. Gemini chooses tools, Zod validates arguments and the server executes Supabase operations with a five-round limit.

## Checks
Run npm run typecheck and npm run build. Test the four logins, an invalid password, chat navigation/reload, order links, a purchase within balance, an unaffordable purchase, duplicate requests, eligible/expired returns, cancellation confirmation and refund credit. The local refund tests accelerate due dates. Verify the actual Cron schedule on Supabase after running the SQL.

Fresh delivered demo orders are 9001–9004 and late orders are 9101–9104, matching C001–C004. Ask to cancel a new wallet purchase to exercise a complete refund.

## Vercel
The Git repository root contains package.json, so use root directory "." and the Next.js preset. Set the same five environment variables and deploy. Supabase keys stay server-side. The scheduled refund job runs in Supabase.

## Submission
Fill in team number, members and roles, live URL and demo access details. Every member contributes a commit. Submit repo URL, Vercel URL and five slides using the trainer's form.
