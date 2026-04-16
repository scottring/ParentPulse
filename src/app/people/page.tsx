'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The People index is now part of the Family Manual.
export default function LegacyPeopleRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/manual');
  }, [router]);
  return null;
}
