import "./support.css";
import { Suspense } from "react";
import AgentChat from "@/components/AgentChat";
import { listTickets } from "@/lib/shop";
import { currentCustomer } from "@/lib/customer";
import Link from "next/link";
async function Tickets() {
  const tickets = await listTickets().catch(() => null);
  return (
    <section className="tickets-section">
      <div className="ticket-heading">
        <h2>Your tickets</h2>
        <span className="ticket-mark" aria-hidden="true">
          ↗
        </span>
      </div>
      {tickets === null ? (
        <p className="notice">
          Tickets could not load. Check Supabase settings.
        </p>
      ) : !tickets.length ? (
        <div className="ticket-empty">
          <span className="ticket-outline" aria-hidden="true" />
          <p>No open threads yet.</p>
          <small>
            Ask the assistant to connect you with our team when you need a hand.
          </small>
        </div>
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
    <div className="support-home">
      <div className="support-title">
        <div>
          <h1>Good questions. Easy answers.</h1>
          <p>Your orders, returns and a little peace of mind.</p>
        </div>
        <span className="care-label">ShopEase customer care</span>
      </div>
      <div className="support-workspace">
        <AgentChat customerId={customer.id} name={customer.name} />
        <aside
          className="support-sidebar"
          aria-label="Order shortcuts and support tickets"
        >
          <section className="order-shortcut-panel">
            <div className="parcel-art" aria-hidden="true">
              <span />
              <i />
            </div>
            <h2>Your next stop?</h2>
            <p>Everything you need, without the digging.</p>
            <Link href="/orders">
              <span>
                My orders<small>Delivery updates & order details</small>
              </span>
              <b aria-hidden="true">↗</b>
            </Link>
            <Link href="/returns">
              <span>
                My returns<small>Check your return requests</small>
              </span>
              <b aria-hidden="true">↗</b>
            </Link>
          </section>
          <Suspense
            fallback={
              <p className="muted" role="status">
                Loading your tickets…
              </p>
            }
          >
            <Tickets />
          </Suspense>
          <Link href="/shop" className="shop-shortcut">
            <span>
              Something catch your eye?<strong>Explore the collection</strong>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
