import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WashPadi | Laundry, made easier",
  description: "Manage laundry pickups, tagged items, order progress, and payments with WashPadi.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
