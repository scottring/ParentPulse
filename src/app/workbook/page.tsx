'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The Workbook's growth work now lives inside the Family Manual.
export default function LegacyWorkbookRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/manual');
  }, [router]);
  return null;
}
