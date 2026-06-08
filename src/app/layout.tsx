import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dacopas",
  description: "Predecí los resultados del Mundial 2026 con tus amigos",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Dacopas",
    description: "Predecí los resultados del Mundial 2026 con tus amigos",
    images: [{ url: "https://dacopas.com/logo.png", width: 512, height: 512 }],
    siteName: "Dacopas",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Dacopas",
    description: "Predecí los resultados del Mundial 2026 con tus amigos",
    images: ["https://dacopas.com/logo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dacopas",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#eab308",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
