import "./support.css";
import "./workspace-support.css";
import { Suspense } from "react";
import AgentChat from "@/components/AgentChat";
import { listTickets, listOrders } from "@/lib/shop";
import { currentCustomer } from "@/lib/customer";
import Link from "next/link";
async function RecentOrders() {
  const orders = await listOrders().catch(() => null);
  return <section className="recent-orders"><div className="panel-title"><h2>Recent orders</h2><Link href="/orders">View all ↗</Link></div>
    {orders === null ? <p className="muted">Orders could not load.</p> : orders.length === 0 ? <p className="muted">Your orders will appear here after your first purchase.</p> : orders.slice(0, 2).map(order => <Link href={"/orders/"+order.id} className="recent-order" key={order.id}><div><strong>Order #{order.id}</strong><span className="status-badge" data-status={order.status}>{order.status.replaceAll("_", " ")}</span></div><p>{order.order_items.map(item=>item.products.name).join(", ")}</p><small>{order.order_date}<span aria-hidden="true">↗</span></small></Link>)}
  </section>;
}
async function Tickets() {
  const tickets = await listTickets().catch(() => null);
  return (
    <section className="tickets-section">
      <div className="ticket-heading">
        <h2>Recent tickets</h2>
        <Link className="order-link" href="/tickets">
          Raise or manage a ticket →
        </Link>
      </div>
      {tickets === null ? (
        <p className="notice">
          Tickets could not load. Check Supabase settings.
        </p>
      ) : !tickets.length ? (
        <div className="ticket-empty">
          <p>No support tickets yet.</p>
        </div>
      ) : (
        tickets.slice(0, 3).map((ticket) => (
          <article className="ticket-card" key={ticket.id}>
            <div>
              <Link className="order-link" href={"/tickets#" + ticket.id}>
                Ticket #{ticket.id}
              </Link>
              <span className="status-badge">
                {ticket.status === "resolved"
                  ? "Closed"
                  : ticket.status.replaceAll("_", " ")}
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
          <h1>Customer support</h1>
          <p>
            Manage deliveries, returns and tickets with your support assistant.
          </p>
        </div>
      </div>
      <div className="support-workspace">
        <AgentChat customerId={customer.id} />
        <aside
          className="support-sidebar"
          aria-label="Order shortcuts and support tickets"
        >
          <Suspense fallback={<p role="status" className="muted">Loading recent orders…</p>}><RecentOrders /></Suspense>
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
              <strong>Browse the shop</strong>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
