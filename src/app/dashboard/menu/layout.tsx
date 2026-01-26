import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veckomeny",
  description: "Planera din veckomeny och få receptförslag baserat på veckans bästa erbjudanden.",
};

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
