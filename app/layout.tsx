import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mostrador & Chatbot — Comercializadora Chiquihuite",
  description:
    "Sistema de gestión de mostrador y chatbot de WhatsApp (Release 1).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
