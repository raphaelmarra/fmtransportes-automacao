import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FM Transportes - Setor da Embalagem",
  description: "Sistema de envio de pedidos para FM Transportes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
