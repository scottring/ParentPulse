'use client';

/* ================================================================
   /manual — the old Family Summary. Retired in favor of /people,
   which renders a simpler, journal-first People list per the Stitch
   design. Redirect preserves any links to the old route.
   ================================================================ */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManualLegacyRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/people');
  }, [router]);
  return null;
}
