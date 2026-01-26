import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Erbjudanden",
  description: "Se veckans bästa erbjudanden från dina valda matbutiker. Jämför priser från ICA, Hemköp, Coop och Lidl.",
};

export default function DealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
