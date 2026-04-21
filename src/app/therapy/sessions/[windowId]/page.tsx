'use client';

import { useParams } from 'next/navigation';
import { ClosedSessionView } from '@/components/therapy/ClosedSessionView';

export default function ClosedSessionPage() {
  const params = useParams();
  const windowId = typeof params?.windowId === 'string' ? params.windowId : null;

  if (!windowId) {
    return <div style={{ padding: 40, fontFamily: 'Georgia, serif', color: '#6d5a3f' }}>Session not found.</div>;
  }

  return <ClosedSessionView windowId={windowId} />;
}
