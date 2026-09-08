import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rovaulta — Confidential deployment gate",
  description: "Exact-clearance and Ledger-backed robot release authorization",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
