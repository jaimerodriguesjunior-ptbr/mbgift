import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

import "@/app/globals.css";

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
  title: "MBGifts | Gestão de presentes, listas e operação da loja",
  description: "Plataforma MBGifts para gestão de produtos, clientes, condicionais, caixa e listas de presentes."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable} antialiased`}>
      <body className="font-sans text-ink">{children}</body>
    </html>
  );
}
