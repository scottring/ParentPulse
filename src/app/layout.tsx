import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AppBoundary from "@/components/relish/AppBoundary";

const bodyFont = localFont({
  src: "./fonts/ibm-plex-sans.ttf",
  variable: "--font-parent-body",
  weight: "100 700",
  display: "swap",
});
const displayFont = localFont({
  src: "./fonts/literata.ttf",
  variable: "--font-parent-display",
  weight: "200 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Relish — The Operating Manual for Relationships",
  description:
    "A private, living book of the people you love. Understand a little more. Find your next small move.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Relish",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d0d9d6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} antialiased`}
      >
        <AppBoundary>{children}</AppBoundary>
      </body>
    </html>
  );
}
