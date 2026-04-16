const crypto = require("crypto");

function hashApiKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function extractBearer(authorizationHeader) {
  if (!authorizationHeader) return null;
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function validateApiKey({ apiKey, householdId, apiKeysCollection }) {
  if (!apiKey) return { ok: false, status: 401, error: "missing api key" };
  if (!householdId) return { ok: false, status: 400, error: "missing householdId" };

  const hash = hashApiKey(apiKey);
  const snap = await apiKeysCollection.doc(hash).get();
  if (!snap.exists) return { ok: false, status: 401, error: "invalid api key" };

  const data = snap.data();
  const allowed = Array.isArray(data.allowed_households) ? data.allowed_households : [];
  if (!allowed.includes(householdId)) {
    return { ok: false, status: 403, error: "household not allowed for this key" };
  }

  return { ok: true, label: data.label || null };
}

module.exports = { hashApiKey, extractBearer, validateApiKey };
