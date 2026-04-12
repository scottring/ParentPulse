'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy dashboard route — redirects to the workbook, which is now the
 * canonical home for the growth feed. Kept as a redirect for bookmarks
 * or deep links that still point here.
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workbook');
  }, [router]);

  return null;
}
