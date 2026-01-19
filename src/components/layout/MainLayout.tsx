'use client';

import Navigation from './Navigation';
import SideNav from './SideNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Blueprint grid background */}
      <div className="blueprint-grid"></div>

      <Navigation />
      <SideNav />

      {/* Main content - adjust padding for sidenav on desktop */}
      <main className="lg:pl-64 pt-20">
        {children}
      </main>

      {/* Blueprint grid CSS */}
      <style jsx>{`
        .blueprint-grid {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            linear-gradient(rgba(30, 58, 95, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 58, 95, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>
    </div>
  );
}
