import Link from "next/link";
import { listReturns } from "@/lib/shop";
export const dynamic = "force-dynamic";
export default async function Returns() {
  const rows = await listReturns().catch(() => null);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Returns</h1>
      </div>
      {!rows ? (
        <p>Could not load returns. Refresh to try again.</p>
      ) : !rows.length ? (
        <div className="empty-record">
          <h2>No returns yet</h2>
          <Link href="/">Request a return in support chat →</Link>
        </div>
      ) : (
        rows.map((row) => (
          <article key={row.id} className="account-record">
            <h2 className="font-bold">{row.products.name}</h2>
            <p>
              Return #{row.id}{" "}
              <span className="status-badge">
                {row.status.replaceAll("_", " ")}
              </span>
            </p>
            <p className="mt-2 text-sm">
              <Link className="order-link" href={"/orders/" + row.order_id}>
                Order #{row.order_id}
              </Link>{" "}
              · {row.reason}
            </p>
          </article>
        ))
      )}
    </>
  );
}
