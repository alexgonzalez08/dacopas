import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mundial 2026 — Pronósticos",
  description: "Crea tu liga y predice los resultados del Mundial 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
