import Link from "next/link";
import { listReturns } from "@/lib/shop";
export const dynamic = "force-dynamic";
export default async function Returns() {
  const rows = await listReturns().catch(() => null);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>My Returns</h1>
      </div>
      {!rows ? (
        <p>Could not load returns. Refresh to try again.</p>
      ) : !rows.length ? (
        <p>No returns yet. Request one in Support chat.</p>
      ) : (
        rows.map((row) => (
          <article
            key={row.id}
            className="mb-3 rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="font-bold">{row.products.name}</h2>
            <p>
              Return #{row.id} · {row.status.replaceAll("_", " ")}
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
