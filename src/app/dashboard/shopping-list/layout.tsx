import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inköpslista",
  description: "Din smarta inköpslista grupperad efter butik för enklare handling.",
};

export default function ShoppingListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
