'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopNav } from '@/design/shell/TopNav';
import CaptureSheet from '@/components/capture/CaptureSheet';

/**
 * Single top chrome, mounted once at the root layout. Three rooms:
 * The Workbook · The Family Manual · The Archive. No route-specific
 * variants — the old /journal / /manual / /surface / /rituals nav is
 * deleted.
 *
 * Also renders the global CaptureSheet so the Pen is always on-call.
 * The workbook page overrides with its own tailored CaptureSheet.
 */
export default function GlobalNav() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      <TopNav userName={user?.name} onSignOut={handleSignOut} />
      {user && <CaptureSheet />}
    </>
  );
}
