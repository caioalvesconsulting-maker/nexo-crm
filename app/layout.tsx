import type { Metadata } from "next";
import "./globals.css";
import "./orbital.css";
import "./growth.css";

export const metadata: Metadata = {
  title: "Nexo CRM · Seu próximo negócio começa aqui",
  description: "Seu relacionamento, suas vendas e seu financeiro. Tudo conectado em um só lugar.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
