import type { Metadata } from "next";
import { checkAccess } from "@/lib/access";
import { PaywallGate } from "@/components/PaywallGate";

export const metadata: Metadata = {
  title: "Veckomeny",
  description: "Planera din veckomeny och få receptförslag baserat på veckans bästa erbjudanden.",
};

export default async function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkAccess();

  if (!access.hasAccess) {
    return <PaywallGate />;
  }

  return children;
}
