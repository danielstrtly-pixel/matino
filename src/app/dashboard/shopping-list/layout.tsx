import type { Metadata } from "next";
import { checkAccess } from "@/lib/access";
import { PaywallGate } from "@/components/PaywallGate";

export const metadata: Metadata = {
  title: "Inköpslista",
  description: "Din smarta inköpslista grupperad efter butik för enklare handling.",
};

export default async function ShoppingListLayout({
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
