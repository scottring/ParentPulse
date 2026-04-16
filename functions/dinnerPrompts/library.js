function pickFromLibrary({ library, audience, theme, recentlyServedIds, flaggedIds, now }) {
  const candidates = library.filter(p =>
    p.audiences.includes(audience) &&
    p.themes.includes(theme) &&
    !recentlyServedIds.includes(p.id) &&
    !flaggedIds.includes(p.id)
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

module.exports = { pickFromLibrary };
