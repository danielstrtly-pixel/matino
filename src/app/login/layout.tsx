import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logga in",
  description: "Logga in på Matino för att se erbjudanden och planera din veckomeny.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
