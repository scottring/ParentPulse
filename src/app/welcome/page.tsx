'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    // Brief pause so the "opening the library" moment is visible,
    // then drop the new reader straight into the workbook.
    const t = setTimeout(() => router.replace('/journal'), 1200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="relish-page">
      <div className="press-loading">Opening the library&hellip;</div>
    </div>
  );
}
