'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Per-person workbook now lives inside each person's manual page.
export default function LegacyWorkbookPersonRedirect() {
  const router = useRouter();
  const params = useParams();
  const personId = (params?.personId as string) || '';
  useEffect(() => {
    if (personId) router.replace(`/people/${personId}/manual`);
    else router.replace('/manual');
  }, [personId, router]);
  return null;
}
