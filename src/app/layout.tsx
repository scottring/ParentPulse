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
  title: "Relish — The journal your family keeps together",
  description:
    "A private book for each person in your family, and a family book you keep together.",
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
  viewportFit: "cover",
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
