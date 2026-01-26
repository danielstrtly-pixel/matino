import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Matino – Spara pengar på maten",
    template: "%s | Matino",
  },
  description: "Hitta veckans bästa matpriser från ICA, Hemköp, Coop och Lidl. Jämför erbjudanden, planera veckomeny och spara pengar på matinköpen.",
  keywords: ["matpriser", "erbjudanden", "ICA", "Hemköp", "Coop", "Lidl", "veckomeny", "spara pengar", "matbudget", "Sverige"],
  authors: [{ name: "Matino" }],
  creator: "Matino",
  publisher: "Matino",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    url: "https://matino.se",
    siteName: "Matino",
    title: "Matino – Spara pengar på maten",
    description: "Hitta veckans bästa matpriser från ICA, Hemköp, Coop och Lidl. Jämför erbjudanden och spara pengar.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Matino – Spara pengar på maten",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Matino – Spara pengar på maten",
    description: "Hitta veckans bästa matpriser från ICA, Hemköp, Coop och Lidl.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
