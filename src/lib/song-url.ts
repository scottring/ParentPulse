import type { SongProvider } from '@/types/journal';

// Parse a streaming-service URL into its provider. Hostname-based,
// deliberately forgiving — if we can't match, it becomes 'other'
// and the entry renderer falls back to a plain link card.
export function detectSongProvider(url: string): SongProvider {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('spotify.com') || host === 'open.spotify.com') return 'spotify';
    if (host.endsWith('music.apple.com') || host === 'music.apple.com') return 'apple';
    if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtu.be' ||
      host.endsWith('.youtube.com')
    ) {
      return 'youtube';
    }
    return 'other';
  } catch {
    return 'other';
  }
}

// Turn a Spotify track/album/playlist URL into its iframe embed
// URL. Returns null if the shape is unexpected — caller should
// fall back to a plain link card.
export function spotifyEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // e.g. https://open.spotify.com/track/{id}
    const match = u.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
    if (!match) return null;
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
  } catch {
    return null;
  }
}

// Extract a YouTube video id from any watch or short URL shape.
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.replace(/^\//, '') || null;
    }
    if (u.pathname.startsWith('/watch')) {
      return u.searchParams.get('v');
    }
    if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/shorts/')) {
      return u.pathname.split('/')[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Apple Music embed — Apple's embed URL mirrors the canonical one
// with host `embed.music.apple.com`. Returns null if not parseable.
export function appleMusicEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('music.apple.com')) return null;
    const rest = u.pathname + u.search;
    return `https://embed.music.apple.com${rest}`;
  } catch {
    return null;
  }
}

// Detect-and-decorate: takes a raw URL and returns the minimal
// shape we persist on the entry. Title/artist/artworkUrl are left
// blank here — a future oEmbed probe can fill them in.
export function parseSongUrl(url: string): {
  url: string;
  provider: SongProvider;
} {
  return {
    url: url.trim(),
    provider: detectSongProvider(url),
  };
}
