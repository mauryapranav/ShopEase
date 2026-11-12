import Link from "next/link";
import { listOrders } from "@/lib/shop";
export const dynamic = "force-dynamic";
export default async function Orders() {
  const orders = await listOrders().catch(() => null);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Orders</h1>
      </div>
      {!orders ? (
        <p>Could not load orders. Refresh to try again.</p>
      ) : !orders.length ? (
        <div className="empty-record">
          No orders yet. <Link href="/shop">Browse products →</Link>
        </div>
      ) : (
        orders.map((order) => (
          <article key={order.id} className="account-record">
            <h2 className="font-bold">
              <Link className="order-link" href={"/orders/" + order.id}>
                Order #{order.id} →
              </Link>
              <span className="status-badge">
                {order.status.replaceAll("_", " ")}
              </span>
            </h2>
            <p className="text-sm text-slate-600">
              Ordered {order.order_date} · ₹
              {order.total_amount.toLocaleString("en-IN")}
            </p>
            <ul className="my-3">
              {order.order_items.map((item) => (
                <li key={item.product_id}>
                  {item.products.name} × {item.quantity}
                </li>
              ))}
            </ul>
            <p className="text-sm">
              {order.delivered_date
                ? "Delivered " + order.delivered_date
                : order.expected_delivery &&
                  "Expected " + order.expected_delivery}{" "}
              {order.courier && " · " + order.courier} {order.tracking_number}
            </p>
            <Link className="order-card-action" href={"/orders/" + order.id}>
              View order details <span aria-hidden="true">↗</span>
            </Link>
          </article>
        ))
      )}
    </>
  );
}
