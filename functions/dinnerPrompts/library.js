function pickFromLibrary({ library, audience, theme, recentlyServedIds, flaggedIds }) {
  const candidates = library.filter(p =>
    p.audiences.includes(audience) &&
    p.themes.includes(theme) &&
    !recentlyServedIds.includes(p.id) &&
    !flaggedIds.includes(p.id)
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickWithFallback({ library, audience, theme, recentlyServedIds, flaggedIds }) {
  // 1. Normal pick
  let prompt = pickFromLibrary({ library, audience, theme, recentlyServedIds, flaggedIds });
  if (prompt) return { prompt, relaxation: "none" };

  // 2. Relax recency
  prompt = pickFromLibrary({ library, audience, theme, recentlyServedIds: [], flaggedIds });
  if (prompt) return { prompt, relaxation: "recency-relaxed" };

  // 3. Drop theme — keep audience + flag exclusion
  const audienceMatches = library.filter(p =>
    p.audiences.includes(audience) && !flaggedIds.includes(p.id)
  );
  if (audienceMatches.length > 0) {
    return {
      prompt: audienceMatches[Math.floor(Math.random() * audienceMatches.length)],
      relaxation: "theme-dropped",
    };
  }

  // 4. Drop audience too — only flag exclusion
  const anyMatches = library.filter(p => !flaggedIds.includes(p.id));
  if (anyMatches.length > 0) {
    return {
      prompt: anyMatches[Math.floor(Math.random() * anyMatches.length)],
      relaxation: "audience-dropped",
    };
  }

  return null;
}

module.exports = { pickFromLibrary, pickWithFallback };
