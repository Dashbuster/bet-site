import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PulseBet",
  description: "Plataforma visual de apostas esportivas com slip funcional e interface premium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
