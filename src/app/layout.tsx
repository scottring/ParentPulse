import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { FloatingCoachButton } from "@/components/coach";
import { QuickCaptureButton } from "@/components/concerns";
import Navigation from "@/components/layout/Navigation";
import SideNav from "@/components/layout/SideNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Relish - Operating Manuals for the People You Love",
  description: "Create comprehensive operating manuals for the important people in your life",
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
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <DemoBanner />
          <Navigation />
          <SideNav />
          <main className="pt-20 lg:pl-64">
            {children}
          </main>
          <QuickCaptureButton />
          <FloatingCoachButton />
        </AuthProvider>
      </body>
    </html>
  );
}
