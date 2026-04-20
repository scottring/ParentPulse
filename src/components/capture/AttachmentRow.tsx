'use client';

import { useRef, useState } from 'react';
import { uploadEntryMedia } from '@/lib/upload-media';
import { parseSongUrl } from '@/lib/song-url';
import type { JournalMedia } from '@/types/journal';

interface AttachmentRowProps {
  familyId: string;
  media: JournalMedia[];
  onChange: (next: JournalMedia[]) => void;
  // Compact variant used in tight layouts (e.g. a practice log).
  compact?: boolean;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `a${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
}

/**
 * Quiet + Image / + Song row. Shared between the Pen (CaptureSheet)
 * and the practice detail page's sit-down log. Emits a `JournalMedia[]`
 * via onChange — parent passes this through to the write.
 *
 * Image files are uploaded to Firebase Storage immediately under a
 * family-scoped ephemeral path; the returned download URL goes into
 * the media array. Songs are stored as URL + provider — no upload.
 */
export function AttachmentRow({ familyId, media, onChange, compact }: AttachmentRowProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [songPopover, setSongPopover] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: JournalMedia[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > MAX_IMAGE_BYTES) {
          setError(`${file.name} is larger than 10MB.`);
          continue;
        }
        const m = await uploadEntryMedia({
          familyId,
          entryId: newId(),
          file,
        });
        uploaded.push(m);
      }
      if (uploaded.length > 0) onChange([...media, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function addSong() {
    const url = songUrl.trim();
    if (!url) return;
    const { provider } = parseSongUrl(url);
    const m: JournalMedia = { type: 'song', url, provider };
    onChange([...media, m]);
    setSongUrl('');
    setSongPopover(false);
    setError(null);
  }

  function removeAt(i: number) {
    const next = [...media];
    next.splice(i, 1);
    onChange(next);
  }

  return (
    <div className="attachment-row" style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          style={pillButtonStyle}
          aria-label="Attach an image"
        >
          + Image
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => void handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => setSongPopover((v) => !v)}
          style={pillButtonStyle}
          aria-label="Attach a song"
        >
          + Song
        </button>
        {uploading && (
          <span style={captionStyle}>Uploading…</span>
        )}
        {error && (
          <span style={{ ...captionStyle, color: 'var(--r-burgundy, #b94a3b)' }}>{error}</span>
        )}
      </div>

      {songPopover && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '10px 12px',
            background: 'var(--r-paper-soft, #faf7f1)',
            border: '1px solid var(--r-rule-4, #e8e1d2)',
            borderRadius: 4,
          }}
        >
          <input
            type="url"
            value={songUrl}
            onChange={(e) => setSongUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSong();
              } else if (e.key === 'Escape') {
                setSongPopover(false);
                setSongUrl('');
              }
            }}
            placeholder="Paste a Spotify, Apple Music, or YouTube link"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--r-serif, Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--r-ink, #2d2418)',
            }}
            autoFocus
          />
          <button type="button" onClick={addSong} style={pillButtonStyle}>Add</button>
        </div>
      )}

      {media.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {media.map((m, i) => (
            <AttachmentThumb key={i} media={m} onRemove={() => removeAt(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentThumb({ media, onRemove }: { media: JournalMedia; onRemove: () => void }) {
  if (media.type === 'image') {
    return (
      <div style={{ position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.url}
          alt={media.alt ?? ''}
          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--r-rule-4, #e8e1d2)' }}
        />
        <RemoveButton onRemove={onRemove} />
      </div>
    );
  }

  if (media.type === 'song') {
    const providerLabel = media.provider ?? 'link';
    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          background: 'var(--r-paper-soft, #faf7f1)',
          border: '1px solid var(--r-rule-4, #e8e1d2)',
          borderRadius: 4,
          minWidth: 0,
          maxWidth: 240,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--r-text-4, #a89373)' }}>♪</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--r-serif, Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--r-ink, #2d2418)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {media.title ?? media.url}
          </div>
          <div style={{ fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 10, color: 'var(--r-text-4, #a89373)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {providerLabel}
          </div>
        </div>
        <RemoveButton onRemove={onRemove} />
      </div>
    );
  }

  return null;
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label="Remove attachment"
      style={{
        all: 'unset',
        cursor: 'pointer',
        position: 'absolute',
        top: -6,
        right: -6,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'var(--r-ink, #2d2418)',
        color: 'var(--r-paper, #fff)',
        fontSize: 11,
        lineHeight: '18px',
        textAlign: 'center',
      }}
    >
      ×
    </button>
  );
}

const pillButtonStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  padding: '4px 12px',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--r-text-3, #6b5d45)',
  border: '1px solid var(--r-rule-4, #e8e1d2)',
  borderRadius: 999,
  transition: 'all 120ms ease',
};

const captionStyle: React.CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  letterSpacing: '0.05em',
  color: 'var(--r-text-4, #a89373)',
};
