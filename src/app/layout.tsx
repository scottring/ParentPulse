import type { Metadata, Viewport } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { WalkthroughProvider } from "@/components/walkthrough/WalkthroughContext";
import WalkthroughOverlay from "@/components/walkthrough/WalkthroughOverlay";
import WalkthroughTrigger from "@/components/walkthrough/WalkthroughTrigger";
import PageFooter from "@/components/layout/PageFooter";
import RitualBanner from '@/components/rituals/RitualBanner';

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-parent-body",
  weight: ["300", "400", "500", "600"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-parent-display",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
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
      <body className={`${dmSans.variable} ${cormorant.variable} antialiased`}>
        <AuthProvider>
          <WalkthroughProvider>
            <RitualBanner />
            {children}
            <PageFooter />
            <WalkthroughOverlay />
            <WalkthroughTrigger />
          </WalkthroughProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
