import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SmartaMenyn – Spara pengar på maten",
    template: "%s | SmartaMenyn",
  },
  description: "Hitta veckans bästa matpriser från ICA, Hemköp, Coop och Lidl. Jämför erbjudanden, planera veckomeny och spara pengar på matinköpen.",
  keywords: ["matpriser", "erbjudanden", "ICA", "Hemköp", "Coop", "Lidl", "veckomeny", "spara pengar", "matbudget", "Sverige"],
  authors: [{ name: "SmartaMenyn" }],
  creator: "SmartaMenyn",
  publisher: "SmartaMenyn",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "sv_SE",
    url: "https://smartamenyn.se",
    siteName: "SmartaMenyn",
    title: "SmartaMenyn – Spara pengar på maten",
    description: "Hitta veckans bästa matpriser från ICA, Hemköp, Coop och Lidl. Jämför erbjudanden och spara pengar.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SmartaMenyn – Spara pengar på maten",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartaMenyn – Spara pengar på maten",
    description: "Hitta veckans bästa matpriser från ICA, Hemköp, Coop och Lidl.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E86A33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${playfair.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
