'use client';

import BudgetAlertBanner from './BudgetAlertBanner';

interface MainLayoutProps {
  children: React.ReactNode;
  // climate prop kept for back-compat with existing callers but ignored —
  // the weather backdrop has been retired in favour of the press aesthetic.
  climate?: unknown;
}

// TopNav is mounted once globally via GlobalNav at the root layout.
// MainLayout only provides the page frame + alert banners.
export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="relish-page">
      <main className="pt-[64px]">
        <BudgetAlertBanner />
        {children}
      </main>
    </div>
  );
}
