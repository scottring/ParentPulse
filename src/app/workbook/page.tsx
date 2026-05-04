'use client';
/* ================================================================
   /workbook — retired May 2026.

   The journal-first reframe consolidated the magazine-style workbook
   into the new home at `/`. Anyone landing here from a stale link
   gets redirected. Eventually this route can be deleted entirely;
   keeping it around for now so old bookmarks still work.
   ================================================================ */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkbookRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--r-cream, #F5F0E8)',
        fontFamily: 'var(--r-serif, Georgia, serif)',
        fontStyle: 'italic',
        color: 'var(--r-text-4, #6B6254)',
        fontSize: 19,
      }}
    >
      Opening…
    </main>
  );
}
