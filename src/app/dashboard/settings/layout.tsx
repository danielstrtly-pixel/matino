import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inställningar",
  description: "Hantera dina preferenser, kostvanor och notifikationsinställningar.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
