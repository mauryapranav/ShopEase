"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
function Label({ children }: { children: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className="nav-label">
      {children}
      {pending && (
        <span className="nav-pending" role="status">
          <span className="spinner" />
          Opening…
        </span>
      )}
    </span>
  );
}
export default function StoreNav() {
  const path = usePathname();
  return (
    <nav className="store-nav" aria-label="Main navigation">
      {[
        ["Support chat", "/"],
        ["Tickets", "/tickets"],
        ["Orders", "/orders"],
        ["Returns", "/returns"],
        ["Shop", "/shop"],
      ].map(([name, url]) => (
        <Link
          key={url}
          href={url}
          aria-current={
            (url === "/" ? path === url : path.startsWith(url))
              ? "page"
              : undefined
          }
        >
          <Label>{name}</Label>
        </Link>
      ))}
    </nav>
  );
}
