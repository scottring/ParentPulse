"use client";
import { AuthProvider } from "@/context/AuthContext";
import { WalkthroughProvider } from "@/components/walkthrough/WalkthroughContext";
import WalkthroughOverlay from "@/components/walkthrough/WalkthroughOverlay";
import WalkthroughTrigger from "@/components/walkthrough/WalkthroughTrigger";
import PageFooter from "@/components/layout/PageFooter";
import RitualBanner from "@/components/rituals/RitualBanner";
import { LayoutChrome } from "@/components/layout/LayoutChrome";
export default function LegacyProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <WalkthroughProvider>
        <RitualBanner />
        <LayoutChrome>{children}</LayoutChrome>
        <PageFooter />
        <WalkthroughOverlay />
        <WalkthroughTrigger />
      </WalkthroughProvider>
    </AuthProvider>
  );
}
