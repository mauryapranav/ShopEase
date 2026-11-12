import Catalog from "@/components/Catalog";
import { listProducts } from "@/lib/shop";
export const dynamic = "force-dynamic";
export default async function Home() {
  const products = await listProducts().catch(() => null);
  return (
    <>
      <section className="shop-hero">
        <div>
          <p className="eyebrow">SMALL FINDS. EVERYDAY JOY.</p>
          <h1>
            Make room for
            <br />
            your favourites.
          </h1>
          <p>
            From home essentials to your next daily companion.
            <br />
            Find something that feels like you.
          </p>
          <a href="#catalog" className="primary">
            Explore the collection
          </a>
        </div>
        <img
          src="https://images.unsplash.com/photo-1541643600914-78b084683601?w=900&auto=format&fit=crop"
          alt="A perfume bottle arranged on a warm neutral background"
        />
      </section>
      {products ? (
        <Catalog products={products} />
      ) : (
        <div className="notice" role="alert">
          Products could not load. Check your Supabase settings and run the
          project seed SQL.
        </div>
      )}
    </>
  );
}
