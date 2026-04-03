'use client';

import Navigation from './Navigation';
import SideNav from './SideNav';
import WeatherBackground from '@/components/dashboard/WeatherBackground';

interface MainLayoutProps {
  children: React.ReactNode;
  climate?: import('@/lib/climate-engine').ClimateState;
}

export default function MainLayout({ children, climate = 'mostly_sunny' }: MainLayoutProps) {
  return (
    <WeatherBackground climate={climate}>
      <Navigation />
      <SideNav />

      <main className="pt-[60px]">
        {children}
      </main>
    </WeatherBackground>
  );
}
