import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Välj butiker",
  description: "Välj vilka matbutiker du vill följa. Se erbjudanden från ICA, Hemköp, Coop och Lidl nära dig.",
};

export default function StoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
