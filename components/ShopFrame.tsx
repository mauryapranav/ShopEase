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
      <div className="workspace-shell">
        <aside className="workspace-nav">
          <p className="nav-caption">Your workspace</p>
          <StoreNav />
          <Link href="/tickets" className="nav-help">Need a follow-up?<strong>Raise a support ticket ↗</strong></Link>
        </aside>
      <main className="store-main">
        {children}
      </main>
      </div>
      <footer>ShopEase · Customer services</footer>
    </>
  );
}
