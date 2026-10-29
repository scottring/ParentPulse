import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AppBoundary from "@/components/relish/AppBoundary";

const dmSans = localFont({
  src: "./fonts/dm-sans.ttf", variable: "--font-parent-body", weight: "100 1000", display: "swap",
});
const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond.ttf", weight: "300 700", style: "normal" },
    { path: "./fonts/cormorant-garamond-italic.ttf", weight: "300 700", style: "italic" },
  ],
  variable: "--font-parent-display", display: "swap",
});

export const metadata: Metadata = {
  title: "Relish — The Operating Manual for Relationships",
  description: "A private, living book of the people you love. Understand a little more. Find your next small move.",
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
  themeColor: "#f6f4ed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${cormorant.variable} antialiased`}>
        <AppBoundary>{children}</AppBoundary>
      </body>
    </html>
  );
}
