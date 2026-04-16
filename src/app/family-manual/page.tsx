'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Legacy route — the Family Manual now lives at /manual.
export default function LegacyFamilyManualRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/manual');
  }, [router]);
  return null;
}
