import Link from "next/link";
import SignOut from "./SignOut";
import StoreNav from "./StoreNav";
export default async function ShopFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="store-header">
        <div className="header-inner">
          <Link href="/" className="brand">
            ShopEase<span>●</span>
          </Link>
          <div className="account">
            <span>Workshop demo</span>
            <SignOut />
          </div>
        </div>
      </header>
      <main className="store-main">
        <StoreNav />
        {children}
      </main>
      <footer>ShopEase · Customer services</footer>
    </>
  );
}
