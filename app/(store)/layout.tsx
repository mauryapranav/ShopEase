import ShopFrame from "@/components/ShopFrame";
export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopFrame>{children}</ShopFrame>;
}
