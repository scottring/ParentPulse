'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy dashboard route — now redirects to the workbook, which is the
 * new home. Kept as a redirect for any bookmarks or deep links.
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/journal');
  }, [router]);

  return null;
}
