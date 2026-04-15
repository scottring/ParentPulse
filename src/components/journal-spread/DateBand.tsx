'use client';

import type { Timestamp } from 'firebase/firestore';

interface DateBandProps {
  date: Date | Timestamp;
}

function toDate(date: Date | Timestamp): Date {
  // Firebase Timestamp has a .toDate() method
  if (typeof (date as Timestamp).toDate === 'function') {
    return (date as Timestamp).toDate();
  }
  return date as Date;
}

export function DateBand({ date }: DateBandProps) {
  const d = toDate(date);
  const formatted = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="date-band">
      {formatted}
      <style jsx>{`
        .date-band {
          text-align: center;
          margin: 14px 0 22px;
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 14px;
          color: #8a6f4a;
          letter-spacing: 0.05em;
          position: relative;
        }
        .date-band::before,
        .date-band::after {
          content: '';
          display: inline-block;
          width: 28px;
          height: 1px;
          background: #c9a66b;
          vertical-align: middle;
          margin: 0 12px;
        }
      `}</style>
    </div>
  );
}
