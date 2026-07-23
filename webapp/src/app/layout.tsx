import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Energy Control Center",
  description:
    "IoT-Based Smart Energy Demand Forecasting & Theft Detection System",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
