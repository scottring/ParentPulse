'use client';

import type { Move, ClaritySessionTurnPayload } from '@/types/obstacle';

export interface TurnListProps {
  moves: Move[];
}

export function TurnList({ moves }: TurnListProps) {
  const turns = moves.filter((m) => m.type === 'clarity-session');
  return (
    <ol
      aria-label="Conversation"
      style={{
        listStyle: 'none',
        padding: 0,
        margin: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {turns.map((m) => {
        const p = m.payload as ClaritySessionTurnPayload;
        const isUser = p.role === 'user';
        return (
          <li key={m.id}>
            <p
              style={{
                fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--r-text-5, #887C68)',
                margin: '0 0 8px 0',
              }}
            >
              {isUser ? 'You' : 'Coach'}
            </p>
            <div
              style={{
                fontFamily: isUser
                  ? 'var(--r-sans, -apple-system, sans-serif)'
                  : "'Cormorant Garamond', Georgia, serif",
                fontStyle: isUser ? 'normal' : 'italic',
                fontSize: isUser ? 16 : 19,
                lineHeight: 1.5,
                color: 'var(--r-ink, #2B2620)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {p.content}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
