// Narrow compatibility fix for jwks-rsa 4.1.0 on hosted CommonJS loaders.
// Keep jose 6 (the supported security line); do not downgrade cryptography.
// Upstream: https://github.com/auth0/node-jwks-rsa/issues/507
// Remove after reviewing a released upstream dynamic-import fix.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const root = path.dirname(require.resolve("jwks-rsa"));
const hash = value => createHash("sha256").update(value).digest("hex");
const patches = [
  {
    "file": "utils.js",
    "original": "c535773fd798202296e846e7c057f96f631148686194ff2990f0729fa4c1b7af",
    "patched": "4f580fb553ac0a0489eb2d70275ca22156c0ea4397448876e5e5b03889f3ca34",
    "replacements": [
      [
        "const jose = require('jose');",
        "const loadJose = () => import('jose');"
      ],
      [
        "async function retrieveSigningKeys(jwks) {",
        "async function retrieveSigningKeys(jwks) {\n  const jose = await loadJose();"
      ]
    ]
  },
  {
    "file": "integrations/passport.js",
    "original": "03557fac70296dda6d19872b1702d2b8f1d4c50d22d3fbcf1fb65f9afa7ddcbb",
    "patched": "a388bb5ef57e2a9acfc7677ce394e44ecba97afc983fcb8036c3c69cdf25a17e",
    "replacements": [
      [
        "const jose = require('jose');",
        "const loadJose = () => import('jose');"
      ],
      [
        "return function secretProvider(req, rawJwtToken, cb) {",
        "return async function secretProvider(req, rawJwtToken, cb) {"
      ],
      [
        "    try {\n      decoded = {",
        "    try {\n      const jose = await loadJose();\n      decoded = {"
      ]
    ]
  }
];
for (const patch of patches) {
  const file = path.join(root, patch.file), source = fs.readFileSync(file, "utf8");
  if (hash(source) === patch.patched) continue;
  if (hash(source) !== patch.original) throw new Error("The authentication dependency changed. Review its module-loading compatibility before releasing.");
  const next = patch.replacements.reduce((text, [from,to]) => text.replace(from,to), source);
  if (hash(next) !== patch.patched) throw new Error("Authentication compatibility patch did not match.");
  fs.writeFileSync(file, next);
}
console.log("Authentication dependencies support hosted module loading.");
