import Link from "next/link";
import { Suspense } from "react";
import SignOut from "./SignOut";
import StoreNav from "./StoreNav";
import { currentCustomer } from "@/lib/customer";
import WalletLive from "./WalletLive";
import { walletSnapshot } from "@/lib/shop";
async function Wallet() {
  const wallet = await walletSnapshot().catch(() => null);
  return wallet ? (
    <WalletLive initial={wallet} />
  ) : (
    <span className="wallet">Wallet unavailable</span>
  );
}
export default async function ShopFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await currentCustomer();
  return (
    <>
      <div className="announcement">
        ShopEase customer care · A little help goes a long way.
      </div>
      <header className="store-header">
        <div className="header-inner">
          <Link href="/" className="brand">
            ShopEase<span>●</span>
          </Link>
          <div className="account">
            <span className="customer-avatar" aria-hidden="true">
              {customer.name[0]}
            </span>
            <span>Hello, {customer.name}</span>
            <Suspense
              fallback={<span className="wallet">Loading wallet…</span>}
            >
              <Wallet />
            </Suspense>
            <SignOut />
          </div>
        </div>
      </header>
      <main className="store-main">
        <StoreNav />
        {children}
      </main>
      <footer>ShopEase · Everyday shopping, personal support.</footer>
    </>
  );
}
