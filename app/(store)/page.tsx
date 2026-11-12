import { Suspense } from "react";
import AgentChat from "@/components/AgentChat";
import { listTickets } from "@/lib/shop";
import { currentCustomer } from "@/lib/customer";
import Link from "next/link";
async function Tickets() {
  const tickets = await listTickets().catch(() => null);
  return (
    <section className="tickets-section">
      <h2>Your support tickets</h2>
      {tickets === null ? (
        <p className="notice">
          Tickets could not load. Check Supabase settings.
        </p>
      ) : !tickets.length ? (
        <p className="muted">Your support requests will appear here.</p>
      ) : (
        tickets.map((ticket) => (
          <article className="ticket-card" key={ticket.id}>
            <div>
              <strong>Ticket #{ticket.id}</strong>
              <span className="status-badge">
                {ticket.status.replaceAll("_", " ")}
              </span>
            </div>
            <p>{ticket.issue}</p>
            {ticket.order_id && (
              <Link className="order-link" href={"/orders/" + ticket.order_id}>
                View order #{ticket.order_id} →
              </Link>
            )}
          </article>
        ))
      )}
    </section>
  );
}
export default async function Support() {
  const customer = await currentCustomer();
  return (
    <>
      <section className="support-intro">
        <div>
          <p className="eyebrow">YOUR PERSONAL SUPPORT DESK</p>
          <h1>
            A little help.
            <br />
            <em>A whole lot easier.</em>
          </h1>
          <p>
            Hi {customer.name}. Let’s sort out your orders, returns and
            everything in between.
          </p>
        </div>
        <div className="support-shortcuts">
          <Link href="/orders">
            <span>Track a delivery</span>
            <small>Find your order and its latest status</small>
            <b aria-hidden="true">↗</b>
          </Link>
          <Link href="/returns">
            <span>Manage a return</span>
            <small>Keep an eye on your requests</small>
            <b aria-hidden="true">↗</b>
          </Link>
        </div>
      </section>
      <AgentChat customerId={customer.id} name={customer.name} />
      <Suspense
        fallback={
          <p className="muted mt-6" role="status">
            Loading support tickets…
          </p>
        }
      >
        <Tickets />
      </Suspense>
    </>
  );
}
