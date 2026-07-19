import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEGIS - Global Intelligence Dashboard",
  description:
    "A real-time world monitor built entirely on free, legal open data: live flights, satellites, earthquakes, natural events, global news, markets and cyber threats on one map.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
