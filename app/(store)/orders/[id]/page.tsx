import Link from "next/link";
import { getOrder } from "@/lib/shop";
import { notFound } from "next/navigation";
export default async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const order = await getOrder(Number(id)).catch((error) => {
    if (
      error instanceof Error &&
      error.message === "Order not found in your account."
    )
      notFound();
    throw error;
  });
  return (
    <section className="order-detail">
      <Link href="/orders" className="back-link">
        ← All orders
      </Link>
      <div className="page-heading">
        <p className="eyebrow">ORDER DETAILS</p>
        <h1>Order #{order.id}</h1>
        <span className="status-badge">
          {order.status.replaceAll("_", " ")}
        </span>
      </div>
      <div className="detail-grid">
        <article className="detail-panel">
          <h2>Your items</h2>
          {order.order_items.map((item) => (
            <div className="order-item" key={item.product_id}>
              <div>
                <strong>{item.products.name}</strong>
                <p className="muted">
                  Quantity {item.quantity} ·{" "}
                  {item.products.return_window_days > 0
                    ? item.products.return_window_days + "-day return window"
                    : "Returns unavailable"}
                </p>
              </div>
            </div>
          ))}
          <div className="order-total">
            <span>Order total</span>
            <strong>
              ₹{Number(order.total_amount).toLocaleString("en-IN")}
            </strong>
          </div>
        </article>
        <article className="detail-panel">
          <h2>Delivery details</h2>
          <dl>
            <dt>Ordered</dt>
            <dd>{order.order_date}</dd>
            <dt>{order.delivered_date ? "Delivered" : "Expected delivery"}</dt>
            <dd>
              {order.delivered_date ||
                order.expected_delivery ||
                "Not scheduled"}
            </dd>
            <dt>Courier</dt>
            <dd>{order.courier || "Not assigned yet"}</dd>
            <dt>Tracking reference</dt>
            <dd>{order.tracking_number || "Available after shipping"}</dd>
          </dl>
          <Link href={"/?order=" + order.id} className="primary mt-5">
            Get help with this order
          </Link>
        </article>
      </div>
    </section>
  );
}
