'use client';

import Navigation from './Navigation';

import BudgetAlertBanner from './BudgetAlertBanner';

interface MainLayoutProps {
  children: React.ReactNode;
  // climate prop kept for back-compat with existing callers but ignored —
  // the weather backdrop has been retired in favour of the press aesthetic.
  climate?: unknown;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="relish-page">
      <Navigation />
      <main className="pt-[64px]">
        <BudgetAlertBanner />
        {children}
      </main>
    </div>
  );
}
