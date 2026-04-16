const crypto = require("crypto");

const THEMES = [
  "courage",
  "gratitude",
  "silliness",
  "kindness",
  "curiosity",
  "family-history",
  "dreams",
  "connection",
  "challenge",
];

function isoWeekKey(date) {
  // Returns "YYYY-Www" string for the date's ISO week
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function pickTheme({ householdId, date, audience }) {
  const salt = audience === "adult" ? "adult-v1" : "kid-v1";
  const key = `${householdId}|${isoWeekKey(date)}|${salt}`;
  const hash = crypto.createHash("sha256").update(key).digest();
  const idx = hash.readUInt32BE(0) % THEMES.length;
  return THEMES[idx];
}

module.exports = { pickTheme, THEMES, isoWeekKey };
