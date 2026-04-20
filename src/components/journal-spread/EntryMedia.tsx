'use client';

import {
  detectSongProvider,
  spotifyEmbedUrl,
  youtubeVideoId,
  appleMusicEmbedUrl,
} from '@/lib/song-url';
import type { JournalMedia } from '@/types/journal';

interface EntryMediaProps {
  media: JournalMedia[] | undefined;
}

/**
 * Renders attached images + songs below an entry body. Feature A
 * of the flows audit. Lightweight:
 *   - Images stack as rounded-bordered thumbnails, max-width 560.
 *   - Spotify/Apple Music: provider iframe embed.
 *   - YouTube: thumbnail + play-link (defer iframe to click so we
 *     don't pile heavy embeds into every entry view).
 *   - Unknown provider or non-URL: plain link card with title fallback.
 */
export function EntryMedia({ media }: EntryMediaProps) {
  if (!media || media.length === 0) return null;

  const images = media.filter((m) => m.type === 'image');
  const songs = media.filter((m) => m.type === 'song');

  return (
    <section aria-label="Attachments" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {images.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
          {images.map((img, i) => (
            <div
              key={i}
              style={{
                border: '1px solid var(--r-rule-4, #e8e1d2)',
                borderRadius: 4,
                overflow: 'hidden',
                background: 'var(--r-paper, #fff)',
                lineHeight: 0,
              }}
            >
              {/* Using a plain <img> to avoid pre-configuring
                  remotePatterns for Firebase Storage in next.config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? 'Attachment'}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          ))}
        </div>
      )}

      {songs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
          {songs.map((song, i) => (
            <SongEmbed key={i} media={song} />
          ))}
        </div>
      )}
    </section>
  );
}

function SongEmbed({ media }: { media: JournalMedia }) {
  const provider = media.provider ?? detectSongProvider(media.url);

  if (provider === 'spotify') {
    const src = spotifyEmbedUrl(media.url);
    if (src) {
      return (
        <iframe
          src={src}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          loading="lazy"
          style={{ border: 'none', borderRadius: 12 }}
          title={media.title ?? 'Spotify embed'}
        />
      );
    }
  }

  if (provider === 'apple') {
    const src = appleMusicEmbedUrl(media.url);
    if (src) {
      return (
        <iframe
          src={src}
          width="100%"
          height="152"
          allow="autoplay *; encrypted-media *;"
          loading="lazy"
          style={{ border: 'none', borderRadius: 12 }}
          title={media.title ?? 'Apple Music embed'}
        />
      );
    }
  }

  if (provider === 'youtube') {
    const id = youtubeVideoId(media.url);
    if (id) {
      return <YouTubeDeferred videoId={id} url={media.url} title={media.title} />;
    }
  }

  // Fallback — quiet link card
  return (
    <a
      href={media.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        border: '1px solid var(--r-rule-4, #e8e1d2)',
        borderRadius: 4,
        textDecoration: 'none',
        color: 'var(--r-ink, #2d2418)',
        background: 'var(--r-paper-soft, #faf7f1)',
      }}
    >
      <span aria-hidden style={{ fontSize: 16, color: 'var(--r-text-4, #a89373)' }}>♪</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {media.title ?? media.url}
        </div>
        {media.artist && (
          <div style={{ fontFamily: 'var(--r-sans, sans-serif)', fontSize: 11, color: 'var(--r-text-4, #a89373)' }}>
            {media.artist}
          </div>
        )}
      </div>
    </a>
  );
}

function YouTubeDeferred({ videoId, url, title }: { videoId: string; url: string; title?: string }) {
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'relative',
        display: 'block',
        textDecoration: 'none',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#000',
      }}
      title={title ?? 'Play on YouTube'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb}
        alt={title ?? 'YouTube thumbnail'}
        style={{ width: '100%', display: 'block', opacity: 0.85 }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        ▶
      </span>
    </a>
  );
}
export type { JournalMedia };
