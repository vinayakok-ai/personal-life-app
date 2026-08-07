import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Impact Lab Carpool — ride together to Whitefield",
  description:
    "Find your ride group for Claude Impact Lab at Polaris School of Technology, Whitefield. Share a cab or a seat, save money, travel greener.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
