import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

import "@/app/globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const storeName = "MBGifts";
const title = `${storeName} - Lista de Presentes`;
const description =
  "Lista de presentes da MBGifts para gestao de eventos, convidados e escolhas da loja.";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["300", "400", "500", "600", "700"]
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"]
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: storeName,
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: storeName,
    title,
    description,
    images: [
      {
        url: "/apple-touch-icon.png",
        width: 180,
        height: 180,
        alt: storeName
      }
    ]
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/apple-touch-icon.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable} antialiased`}>
      <body className="font-sans text-ink">{children}</body>
    </html>
  );
}
