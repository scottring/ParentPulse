"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
const LegacyProviders = dynamic(() => import("./LegacyProviders"), {
  ssr: false,
});
// The local book never mounts Firebase, analytics, or the legacy cloud data hooks.
export default function AppBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  return path === "/" ||
    path === "/relish" ||
    path === "/relish/" ||
    path === "/privacy" ||
    path === "/privacy/" ? (
    <>{children}</>
  ) : (
    <LegacyProviders>{children}</LegacyProviders>
  );
}
