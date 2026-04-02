'use client';

import Navigation from './Navigation';
import SideNav from './SideNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--parent-bg)' }}>
      <Navigation />
      <SideNav />

      <main className="lg:pl-64 pt-20">
        {children}
      </main>
    </div>
  );
}
