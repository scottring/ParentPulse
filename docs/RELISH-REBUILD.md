# Relish: the operating manual for relationships

This branch rebuilds the front door around a living book: notice a moment, consider another perspective, try a small change, and return to keep what you learned. A person’s manual grows from those reflections. It is a working local first release, not a replacement for every legacy feature.

## Run it

```sh
npm ci
npm run dev:local
```

Open http://127.0.0.1:3210/relish/ in a browser. Use this same address and browser profile to reopen a private book. The root route also opens the new experience. The sample book uses fictional people and stories; edits last only for that visit. Create a private book to save your own writing. Legacy Firebase routes remain available, and their providers are loaded only outside the new root and `/relish/` routes. The existing app’s Firebase environment configuration is still needed for a full build of those legacy pages.

## What works

- Responsive home, people, individual manuals, and searchable moments.
- Add a person, edit their chapter introduction and learning notes.
- Guided Notice → Understand → Try flow, with optional AI invitation.
- Return to a moment, record what happened, and add a learning to the person’s manual.
- Create, lock, unlock, export, and restore an encrypted local book.
- Keyboard-accessible dialogs, responsive navigation, reduced-motion support.

## A guided rhythm and tactile feedback

The home screen now suggests a useful next step based on the actual book: add a first person, notice a moment, return to an open experiment after at least a day, or gather the current week. **Your rhythm** explains the Notice → Try & return → Look back practice, time estimates, and exactly which writing is required.

Choose one, three, or five moments as a soft weekly intention and a preferred day to look back. Weeks begin on local-calendar Monday; old missed targets do not accumulate. A saved weekly reflection gathers this week's moments, accepts an optional next intention, and can be revisited. Updating the same week replaces that reflection while preserving previous weeks. Cadence and weekly reflections are optional additions to the existing encrypted book format, so older backups remain readable. Sample changes still last only for the visit. Guidance appears inside the app; this does not schedule notifications or background jobs.

Quiet sounds are off by default. The header control and privacy/settings panel let users enable, preview, and mute the feedback. The app synthesizes short stone-like taps locally with Web Audio; it does not record audio or fetch sound assets. Button activation gets a soft touch; successful persistence gets a two-part settling response. Muting stops active and queued sources; hiding the tab suspends audio. Only the non-sensitive sound preference is stored outside the encrypted book. No sounds play on page load, hovering, or typing.

Finite page entrances, step transitions, tactile button/card responses, and a settling pebble confirmation provide visual feedback. The system reduced-motion preference disables animation and hover movement. See [Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

## Local storage and its limits

The browser stores only an encrypted envelope under `relish.encrypted-book.v1`. AES-GCM uses a fresh random IV for each save; a nonexportable key is derived with PBKDF2-SHA-256, 600,000 iterations, and a random salt. The key and decrypted book remain in memory only while open. The book locks after ten idle minutes, one minute in a hidden tab, or a cross-tab storage change. No Firebase provider, remote font import, or analytics is mounted by the new experience.

This protects the stored copy, not a compromised device or malicious code running in the same browser origin. An unlocked book is readable on the device. Browser extensions, device backups, and OS security are outside this protection. This implementation has not had an independent security audit.

Clearing browser data or losing the browser profile removes the local copy. There is no password recovery. Export encrypted backups from privacy settings and keep the passphrase separately. Restore is available from the new-book screen in a browser profile without an existing book. The app refuses to overwrite an existing book during restore.

This is currently browser storage, not a native macOS document or Keychain vault. Cloud sync, encrypted multi-device sharing, legacy Firebase data migration, and native packaging are not implemented.

## Optional AI

AI runs only when invited. The user reviews the exact excerpt before sending; the whole book is never included. The response is presented as a possibility and becomes part of a moment only if the user chooses it. The core reflection flow works without AI.

For local AI, run Ollama separately with an installed local model and enter its name in the invitation. The app calls only the loopback Ollama service. Before sending writing, it checks `/api/show` metadata and rejects remote models, remote aliases, and unverifiable metadata. It does not install models or start Ollama automatically.

For optional cloud AI, set `OPENAI_API_KEY` in this local app’s environment and select Cloud AI. `RELISH_AI_MODEL` optionally overrides the configured default. Only the reviewed excerpt is sent to OpenAI; the provider’s data policies apply. Requests set `store: false`.

The local route requires a loopback host, matching Origin, and explicit excerpt-consent header. Production builds allow local AI only when `RELISH_LOCAL_AI_ENABLED=true` is explicitly set for a locally hosted installation. Hosted requests instead require a verified account and the controls below. Hosted AI now follows the separate authenticated path below. Provider errors do not log excerpts or return provider internals. Real provider responses require a running local model or configured cloud service; automated tests mock those services.

References: [Web Crypto encryption](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt), [Ollama chat API](https://docs.ollama.com/api/chat), [Ollama model metadata](https://github.com/ollama/ollama/blob/main/api/types.go).

## Verification

```sh
npm run test:relish
npx vitest run __tests__/lib/surface-recipes.test.ts src/app/experiments/__tests__/ArcCard.test.tsx
npx tsc --noEmit
npx next build --webpack
```

The focused suite covers encryption round trips, wrong passphrases, tampering, fresh nonces, schema rejection, sample isolation, encrypted persistence, automatic lock, and AI origin/consent/model boundaries. Additional checks cover calendar-week boundaries, cadence recommendations, review updates, encrypted weekly entries, audio amplitude/tails, opt-in sound, mute cancellation, hidden tabs, and cross-tab sound preferences. The main reflection-to-manual interaction and desktop/mobile layouts were also exercised in a browser.

Two pre-existing build blockers were repaired: outdated GrowthArc test fixtures and a named ArcCard export from a Next page (moved into its own component). No deployment, main-branch merge, cloud data migration, or existing user-data deletion is part of this rebuild.


## Hosted AI preview (October 29, 2026)

This is a fresh start; migrating old Firebase books is intentionally out of scope.
The book remains encrypted in browser storage. An optional, separate Firebase
email/password account enables hosted AI. Email verification is required; the
server checks token validity and revocation on every request. The client uses a
named Auth-only Firebase app with memory-only persistence. It never initializes
Firestore or imports the legacy family/account providers. Reloading or locking
the book ends the AI session.

Only the reviewed excerpt is forwarded to OpenAI; requests use `store: false`.
Relish does not store excerpts or responses server-side. Provider abuse-monitoring
retention can still apply; see [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).
The server stores only opaque user identifiers and quota counters in
`relish_ai_usage`, a server-only collection denied to clients by default rules.
A Firestore transaction limits each verified account to 3 requests/minute and 20
per UTC day, with an overall preview cap of 200/day. Failed provider requests count
toward the quota to bound retry abuse. Missing quota storage fails closed.

Server-only hosting variables:
- `OPENAI_API_KEY`
- `RELISH_FIREBASE_ADMIN_JSON` (service account JSON for the configured Firebase project)
- `RELISH_AI_MODEL` (defaults to `gpt-4o-mini`)
- `RELISH_AI_ORIGINS` (comma-separated HTTPS custom origins)

Vercel's deployment and branch URLs are accepted directly from server environment
variables. All requests require exact same-origin consent; arbitrary forwarded
hosts are ignored. The body is bounded to 30 KB as it is read, regardless of the
Content-Length header. Hosting never enables the loopback Ollama provider.
Secrets are excluded from uploads and must never use a `NEXT_PUBLIC_` prefix.

`npm run build` explicitly uses Webpack: the installed Next 16.1.2 Turbopack font
resolver fails on the Google font assets. This makes the tested and hosted build
commands identical. A hosted preview must be verified before any main-branch release.

The hosted build exposed a Google font URL change incompatible with this Next
font loader. The same DM Sans and Cormorant Garamond variable fonts are now
bundled from the official Google Fonts repository, together with their OFL
licenses. Neither building nor visiting Relish requires a Google Fonts request.


## Live preview verification — October 30, 2026

Verified on the Git-backed Vercel preview at commit `39f9052`:
- Real OpenAI response with fictional text and a temporary verified Firebase account.
- Unauthenticated requests: 401; foreign Origin: 403; unverified email: 403.
- Daily user quota: 429 with Retry-After. Two concurrent requests for one remaining
  minute slot returned one 200 and one 429; persisted counters admitted exactly one.
- Direct authenticated client reads of the usage collection: 403.
- Hosted create/save/reload, wrong-passphrase rejection, and correct unlock.
- Browser backup export contained only the encrypted envelope, with no plaintext
  name, owner, or passphrase. Restored the file through the UI on a fresh HTTPS origin.

Branch-scoped Vercel secrets are applied to Git-triggered previews. A manual CLI
upload with only a commit-ref metadata value did not receive those secrets; use
Git-backed deployments for release verification. Production remains unchanged.

The hosted browser flow also verified AI sign-in, explicit excerpt submission,
real response display, opt-in application of the response, and encrypted moment
saving. Locking and reopening the book required a fresh AI sign-in. Final local
validation passed 65 focused tests, TypeScript, and the production build.
