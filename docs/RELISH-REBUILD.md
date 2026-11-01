# Relish: the operating manual for relationships

Release scope: a fresh start with independently encrypted editions for adults and children, optional cross-device sync through adult accounts, chosen encrypted passage sharing, and family pass-and-play. Existing users do not need to migrate. The root and `/relish/` open the living book; legacy entry routes redirect there without changing legacy stored data.

## Run and verify

Use Node 22 and `npm ci`, then `npm run dev:local`. Open http://127.0.0.1:3210/relish/ in a modern browser with Web Crypto and Web Locks. Keep that address and browser profile to reopen local books.

```sh
npm run test:relish
npm run test:auth-runtime
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

`npm run build` uses Webpack, matching the hosted build. A checksum-guarded install/prebuild correction loads jose 6 through dynamic import inside jwks-rsa 4.1.0; this fixes the hosted CommonJS startup failure tracked in [upstream issue 507](https://github.com/auth0/node-jwks-rsa/issues/507) while retaining the supported cryptography version. A prebuild check disables native require(ESM), loads the actual authentication packages, and verifies a real RSA signature and tamper rejection. Dependency changes fail the checksum guard until reviewed. Fonts and the approved muted alpine artwork are bundled locally. The manifest supports portrait and landscape. There is no service worker or promise of loading the site without a network connection; a loaded private book can be used without an online account.

## A living book with a stopping point

Each edition opens with Activities: personal journal, guided reflection, or play together. A personal bookmark tracks the ongoing chapter. A short visit has an explicit purpose, estimated duration and finishing condition: choose a direction and notice a moment, plan a small practice, or return and keep an honest reflection. A visit completes only after the encrypted write succeeds. Private drafts and paused sessions can be resumed. Three chapters collect personal words, relationships and practices.

Two family games support 2–12 selected players, including guests. Players choose who starts and may pass. The handoff screen hides the preceding answer. Everyone must approve before a shared game page is kept; finishing without saving is valid. Private chapters and online sessions are put away during play. Returning to a private edition requires unlocking it. Game approvals are in-person choices, not authenticated signatures. Games are on one device, not remote multiplayer.

Finite page and cover transitions respect reduced-motion preferences. Stone-like sounds are synthesized locally, off by default, and stop when muted or the tab is hidden. These sounds use no microphone or remote sound files; optional voice writing has a separate explicit recording flow. The contextual guide is deterministic; optional AI is clearly identified separately.

## Separate local editions

A device can hold multiple independently encrypted editions. Each has its own passphrase and encrypted envelope. The original envelope key is retained for existing local books; new ones use a random identifier. Shelf labels, sound preferences and sync bindings (account UID, opaque book/revision IDs and ciphertext fingerprints) are unencrypted device metadata. The sample edition is fictional and memory-only.

AES-GCM uses fresh random IVs. PBKDF2-SHA-256 with 600,000 iterations and a random salt derives a nonexportable encryption key. An unlocked key and book stay in memory. Idle timeout is ten minutes, reduced to one minute while hidden. Locking, switching editions, or detecting another tab's change removes decrypted state and ends online authentication.

Functional writes are serialized against the current book and protected by an origin-wide exclusive Web Lock. Envelope checks prevent stale-tab overwrite. Creation, restore, save and removal are guarded. A failed write does not advance a session. Restore validates the complete book, including living sessions, game approvals and connection records, and refuses to overwrite another edition. A restored backup can be added alongside other books.

Export encrypted backups regularly. Clearing browser data, losing a profile or forgetting a passphrase can make the book unavailable. Relish cannot recover its passphrase. Books synchronize only after explicit opt-in through Account. Restoring an exported backup remains available for local-only books. This is browser storage, not a native macOS document or Keychain vault. An unlocked or compromised device, browser extension, or malicious same-origin script remains outside the encryption boundary. No independent security audit is claimed.

Removing a local edition requires unlocking it and typing its name. It removes only that device's copy; backups and online records are separate.

## Adult connected editions

Online accounts are intended for adults aged 18 and older. New account and edition connection flows require adult confirmation; this is self-confirmation, not identity or age verification. Children’s editions can remain local or use a parent-authorized encrypted copy in an adult’s library; they never create independent online accounts. Each adult uses their own verified Firebase email/password account. Auth uses a named, Auth-only Firebase app with in-memory persistence and never initializes client Firestore.

Connecting explicitly publishes an edition name, a P-256 ECDH public key and its fingerprint. The corresponding private key is stored only inside the encrypted book (local copy, optional sync copy and backup). An account's key is immutable: open the matching synced edition or backup on another device. Members can compare fingerprints out of band.

An organizer creates a family connection and one-person invitation codes. Codes are random, expire in 24 hours, are stored hashed, and are consumed transactionally. A new code or membership change invalidates the current code. The family has at most 12 connected adult editions. Organizers may transfer their role or remove members; an organizer with remaining members must transfer before leaving or deleting an account.

Only the exact selected passage is offered to explicitly chosen editions. For each recipient the browser generates a fresh ephemeral ECDH key, derives an AES-256-GCM key using HKDF-SHA-256, and encrypts the title and text. Authenticated context binds protocol version, passage ID, family ID, sender, recipient and key fingerprint. The relay receives ciphertext, public keys and delivery metadata; it does not receive the selected plaintext or full book. The server authenticates the sender; this protocol does not independently sign authorship against a compromised relay.

Recipients decrypt locally and choose whether to keep a passage. A kept copy enters their encrypted private chapter with attribution, never shared game pages automatically. If the recipient opts into personal manual analysis, accepted text can be included among their recent pages, with author attribution. Acknowledgment removes their relay packet. Withdrawal removes remaining packets but cannot recall saved copies. Membership removal ends access to pending relay content. The newest 60 invitations are displayed; kept passages remain in the local edition. This is selective copying, not shared-document synchronization.

Unfinished composer text is encrypted locally when the connection dialog is closed normally; recipients must be chosen again. Sending first saves an encrypted pending draft; retries reuse the same ID and ciphertext. The relay preserves a payload hash so retrying after acceptance cannot recreate a removed packet. An abrupt tab close before saving a composer draft may lose it.

## Server boundaries and deletion

`/api/relish/connections/` requires exact configured HTTPS origin, explicit consent header, a verified nonanonymous Firebase token, revocation checking, bounded streamed JSON and no-store responses. The server enforces current membership and organizer privileges transactionally, only returns the requesting recipient's packet, and never exposes provider errors. Direct client access to `relish_connections_*` collections is denied by the deployed default Firestore rules.

Durable limits are 60 actions/minute, 2,000/day and 40 sends/day per account. The relay stores account identifiers, edition names/public keys, membership, hashed invitations, delivery choices, ciphertext and usage counters. Operational metadata remains until account removal; invitation expiry invalidates access, not automatic physical deletion.

Account deletion requires typed confirmation and a sign-in within 15 minutes. A resumable deletion marker blocks new sharing, membership is removed, sent relay documents and incoming packets/receipts are removed, invitation records and individual usage records are removed, then Firebase authentication and the profile are deleted. Large cleanup passes ask the owner to retry until finished. Other members' opaque inbox pointers may remain, but refer to missing documents and expose no passage. Other people's local copies and hosting-provider operational logs cannot be deleted by this control. Legacy Firebase collections are untouched by this fresh-start release.

The public `/privacy/` page describes these boundaries. The living-book response uses a per-request nonce CSP, restricts active scripts and connections, denies framing, and permits same-origin microphone/camera access only on the living-book route, with browser permission, and disables geolocation/payment permissions. The root redirects to that route. Legacy routes redirect to the new experience.

## Optional AI

On-demand AI runs only when invited. Users review the exact excerpt; the whole book is never sent. Separately opted-in automatic manual analysis is described below. A response is a possible perspective and enters the book only if chosen. Core sessions and games work without AI.

Hosted AI requires the same verified adult account. Server-only variables are:

- `OPENAI_API_KEY`
- `RELISH_FIREBASE_ADMIN_JSON`, matching `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `RELISH_AI_MODEL` (default `gpt-4o-mini`)
- `RELISH_AI_ORIGINS` for verified HTTPS custom domains

Vercel's deployment and branch URLs are accepted from server environment variables. Secrets are configured for preview and production builds. The obsolete, unused `NEXT_PUBLIC_OPENAI_API_KEY` hosting variable was removed. No provider secret belongs in a browser bundle.

Requests use `store: false`; Relish stores no AI excerpt or response server-side. OpenAI abuse-monitoring retention may apply; see [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Firestore transactions limit AI to 3 requests/minute, 20/day/account and 200/day globally. Failed provider requests count toward the quota. Missing quota storage fails closed. The daily global cap is a deliberate cost guard for the first release.

For a locally hosted installation, Ollama is optional. The app accepts only loopback connections, checks model metadata before sending writing, and rejects remote aliases or unverifiable models. It does not install or start Ollama. Production local installations require explicit `RELISH_LOCAL_AI_ENABLED=true`; the public host never enables loopback AI.

## Release evidence and rollout

The focused automated suite covers encrypted persistence/restore, wrong passwords and tampering, stale/concurrent writes, independent editions, local removal, private/shared UI boundaries, game completion, session recovery, sound preferences, AI boundary checks, connection request limits, authenticated encryption, interrupted-send retry and composer recovery.

`scripts/verify-relish-release.ts` runs real authenticated integration checks against the local or approved hosted preview. It creates isolated fictional accounts and removes their data in `finally`. Configuration comes from an ignored `.env.release-test.local` containing public Firebase settings plus a matching existing administrator credential. It does not print credentials. `RELISH_VERIFY_AI=1` adds one real hosted AI request with a fictional excerpt. `RELISH_KEEP_QA=1` is only for deliberate browser fixtures and requires explicit later cleanup.

Live checks cover unauthenticated/unverified/foreign-origin rejection, adult confirmation, immutable edition keys, concurrent one-use invitations, organizer-only actions, exact recipient decryption, ciphertext-only relay storage, direct client database denial, removed-member isolation, receipts, retry after acceptance, withdrawal, account deletion and revoked sessions.

Browser verification covers personal session pause/resume/finish, five-person play and unanimous approval, encrypted backup/restore, multiple books, real-account offering and acceptance, sign-out on switching, and tablet/phone layouts. A hosted release candidate must additionally pass the production build, exact-deployment live checks, CSP/hydration check and real AI response before main is approved.

Production is built only from main. Rebase on freshly fetched origin/main, run checks, and obtain Scott's approval before merging/pushing main. A branch preview is not production. Do not deploy or promote an unmerged branch. The production release is complete only after origin/main and the live production deployment match and the production smoke check passes.

## Reader profiles and parent controls

New editions and older editions without a profile stop at an explicit reader setup after unlocking. A parent chooses under 6, 6–8, 9–12 or 13–17 for a child; adults confirm their own 18+ edition. No name, relationship label or writing is used to infer age. Profiles are optional in the backup schema for compatibility, but absent profiles never enable AI or connections. Existing writing and saved games are preserved, and the setup asks the parent to review any existing content before assigning a child's range.

The range and a salted PBKDF2-SHA-256 (600,000 iterations) parent-passphrase verifier live inside the encrypted vault and backup, never the bookshelf index or a server profile. Child age changes and promotion to adult require that separate parent passphrase. It does not unlock private writing and cannot be recovered. Successful setting changes end online authentication. These are local app controls, not verified age or device-wide parental controls: a person able to change the browser/app or decrypt and rewrite a backup can bypass them; creating another edition is not an OS-level restricted action.

Written, deterministic guidance adapts thread choices, prompts, practices, session duration, finishing conditions and reflection options to the range. Under-6 use is explicitly together with a grown-up. Younger children can choose a feeling instead of typing; teens get language about support, space and boundaries. Children are never asked to repair adults' disagreements or manage someone else's feelings. Existing text is not retrospectively filtered or classified.

General AI perspectives (including local Ollama) and online passage sharing remain unavailable in child editions. Parent-assisted voice and manual suggestions have separate controls: verified adult authentication, a local parent passphrase, explicit visit consent, age-appropriate manual prompting, and separate controls for transcription and text analysis. No independent child account is created. Edition headers guard accidental/stale use, not verified age or device-wide restrictions.

Family play asks for the selected participants' age ranges. Unknown ranges use the simplest under-6 set. The youngest selected range determines new prompts and choices, capped by the hosting child edition's range even if its owner is not playing. A round stores its content version and audience with the encrypted game so choices and reveal text survive reload/restore. Older saved games retain the original wording. Other people's private editions are never opened to obtain their ages.


## Continuous pages, photos and voice

Your pages interleaves kept journal entries, guided moments, reflections, approved game pages and accepted passages chronologically. Editing preserves original placement; unfinished drafts remain separate. Private people tags are local metadata and never grant access. A chosen excerpt can enter the local Family album or prefill the existing encrypted adult-to-adult offer flow. Recipients still approve their copy. Photo sharing is local Family album only in this release.

Up to four photos per journal page are re-encoded as JPEG (long edge at most 1,600 pixels, at most 350 KB each), stripping embedded metadata. AES-GCM encryption uses the edition key and binds each blob to its photo ID. Ciphertext lives in IndexedDB, separate from the text envelope. Up to 200 referenced photos per edition are supported. Backup packages include all referenced ciphertext and allow at most 120 MB; the text envelope remains bounded at 12 MB. Restore authenticates all referenced media before writing it. Unreferenced encrypted blobs can remain until the local edition is removed. No photo is sent to AI.

Voice uses MediaRecorder, up to two minutes / 3 MB per take. The user reviews a take locally, explicitly sends that clip, then reviews/edits the transcript before insertion. Microphone tracks stop on completion, hiding or closing; late permission results and requests are cancelled. Audio is memory-only. The server validates origin, consent, verified adult authentication, type/magic bytes and streamed size before calling OpenAI audio transcriptions. Default model: `gpt-transcribe`; optional `RELISH_TRANSCRIPTION_MODEL`. Durable limits: 3/minute, 30/day/account, 300/day globally. No audio, transcript or journal context is logged/stored by Relish. Provider failures use generic errors and count toward quota.

## Automatic living manuals and provider setup

Manual analysis is off by default. An adult authorizes each unlocked visit, then separately enables personal and/or Family analysis. Only the six latest kept text sources (at most 1,800 characters each) are sent after changes. Drafts, photos/captions and private person tags are excluded. Family sources are only chosen album passages and approved game pages. The guide returns up to three tentative, source-cited ideas, never automatic accepted conclusions. Keep/dismiss decisions and source snapshots stay in the encrypted book. Only kept Family ideas appear in shared time. Disabling, signing out, editing or entering shared time cancels pending work; stale results cannot overwrite changed source context. Manual requests share the existing written-AI quota and use `store:false`.

Standard privacy configuration (October 31, 2026, requested by Scott):
- Adult and parent-assisted dictation use `/v1/audio/transcriptions`, whose published endpoint table lists no training, abuse-monitoring retention, or application-state retention. No stored files/conversations are created. This is an endpoint property, not a claim of project-wide ZDR approval. Adult authentication, parent passphrase, visit consent and per-take review are unchanged.
- Adult automatic manual analysis is available using standard API controls: `store:false`, no training by default, and possible abuse-monitoring retention for up to 30 days. The opt-in explains these controls and asks adults not to include under-13/applicable-digital-consent personal information. Family sources remain explicitly approved passages only.
- `RELISH_MANUAL_ZDR_VERIFIED` remains false by default and gates automatic text analysis in child editions. Do not turn it on without approval/enablement for the actual hosting-key project. The flag is enforced server-side as well as in the UI.

The inspected OpenAI Personal / Default project showed API-call logging controls but no ZDR control; ownership of the hosting key was not established. Scott declined the sales request, so none was submitted. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) and [under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance). Standard transcription retention does not establish project-wide ZDR eligibility or general legal compliance.

## iPhone Duo and the native development app

Apple released iPhone Duo October 23, 2026. The UI adapts to available width, never a user-agent, a device name or the experimental posture API. The Activities home offers direct journal and voice entry at every width. At less than 640 CSS pixels, choices stack and keep their stopping points visible; the editor prioritizes words, voice and Keep before optional title/color/tags. At 640 and above it opens a spread with the preceding kept page beside the same editor. Readers show the current and following chronological page. Existing bookmark spreads also open at 640. All four safe-area edges are respected. Outer landscape and inner Split View stay compact.

The same mounted editor, save queue and voice dialog survive resizing. No entry is automatically kept or shared by a fold. A one-sentence capture has an explicit stopping point. Reduced-motion preferences and optional sound remain in effect.

`ios/Relish.xcodeproj` is a real SwiftUI iOS 27.1+ development target, built with the installed iOS 27.2 SDK. It hosts one persistent WKWebView backed by the existing encrypted vault, shields app-switcher snapshots, asks for camera/microphone permission, opens external links outside the book and exports encrypted backups through the system share sheet. Debug points at local port 3210; Release is pinned to app.relish.my. No provider keys or JS/native credential bridge are bundled. See `ios/README.md` for build and distribution notes.

Verified in Device Hub’s iPhone Duo simulator: outer quick entry, typed fictional text, unfold to a live spread, fold back with the text intact, keep once, and inner portrait/landscape reading. Camera/microphone hardware, backup share sheet, physical-device signing and App Store distribution are not yet verified. The app requires network access to load the hosted experience; this is not an offline native rewrite. Safari and native WKWebView have separate stores, so existing books can move between them through encrypted sync or backup/import.


## Clear activities at the opening (November 1, 2026)

Every unlocked edition opens to Activities: personal journal, guided reflection, or play together. Each choice names an approximate duration and a stopping point. Journal and microphone controls open the existing editor directly; guided reflection begins the next age-appropriate step or resumes the unfinished visit. Games resume an existing round instead of replacing it. Reading pages and reviewing available manual suggestions remain secondary choices.

Save for later and Pause here return to Activities only after persistence succeeds. The most recently updated journal draft has a direct resume action; up to three unfinished pages appear below, with access to the full list. Kept pages and completed guided visits offer Choose another activity alongside the existing finish/close action. View changes return to the beginning of the screen; resizing never remounts the editor. Shared play still removes private activities and requires unlocking before returning to an actual private edition.

Validation: 175 focused Relish tests, TypeScript, targeted ESLint, and the production build. Browser checks cover direct journal capture, a draft surviving 382→669px resizing, save/resume, guided entry/pause, shared-game selection, and responsive choices at Duo outer/inner and desktop widths. No storage schema, provider privacy policy, or account permissions change in this update.


## Account library and encrypted cross-device sync (November 1)

Sign in is visible on the sample, locked book and bookshelf. Account opens an adult’s library of up to 20 independently encrypted adult/child editions. A new device signs into the same verified email account, selects an edition, and supplies that book’s separate passphrase. No book key or passphrase goes to the server. Enabling an existing child edition’s sync requires its parent passphrase and explicit parent consent. This changes the earlier local-only child release choice: child accounts and general online sharing remain unavailable, but parents can sync encrypted children’s books. It does not change AI or transcription consent/retention rules.

The same existing Firebase project supplies Authentication and Firestore. `/api/relish/sync/` authenticates a revoked-token-checked verified adult session, validates same-origin consent and bounds actual streamed bytes. Firestore client access to `relish_sync/{uid}` is denied by existing rules. UID comes only from the verified token. Immutable SHA-256-addressed encrypted text chunks and photo blobs stay under Firestore/function document/request limits. A manifest publishes a complete revision with compare-and-swap; missing chunks cannot be committed. A lost-response retry with the same ciphertext fingerprint is idempotent. Quotas are 20 editions, 300 MB of stored ciphertext, 400 requests/minute and 20,000/day/account. Existing text/photo/backup limits still apply.

Device writes happen first. While signed in, encrypted changes upload after a short delay; the client checks remote revisions on focus, reconnect and every 30 seconds. Clean local books receive remote changes only outside editors, dialogs and shared play. Divergent versions require an explicit Keep both action: the complete device copy, including photos, is preserved as a separate local edition before opening the latest remote version. No automatic content merge or last-writer-wins overwrite. A missing remote revision does not recreate a removed synced copy. A locked book ends authentication and aborts client requests. Already submitted encrypted commits may finish; their fingerprint is reconciled on the next sign-in.

Current and previous manifests are retained for safe transfers. Bounded garbage collection removes older unreferenced ciphertext after an hour, while a cursor ensures protected old blobs cannot starve cleanup. Removing a synced book atomically removes its current/previous blobs unless another edition references them. Deleting the account removes all synced books and blobs before authentication removal; a content-free marker blocks delayed authorized requests from recreating storage. Local copies are separately controlled.

`scripts/verify-relish-sync.ts` creates fictional accounts to verify actual token/origin gates, same-account encrypted journal/photo restore, other-account isolation, denial of direct authenticated Firestore reads, simultaneous-save conflicts, idempotent retries, adult/child books in one library, and deletion. `--keep-browser` temporarily retains one fictional library in a private `/private/tmp` fixture for UI checks; `--cleanup` removes it. No real family data is used.


### Voice entry account handoff

Voice entry now has separate account, email-verification, and recording-consent steps. It uses the current adult account without asking for credentials again, observes account changes while open, and refreshes the verified ID token after the user returns from email verification. Signed-out users are told to use their existing account password; opening a local book is separate from signing in online. Online sessions remain memory-only and end on reload, lock, or shared play. Parent approval and the child edition’s parent passphrase remain required before child recording. Consent text uses readable touch-friendly controls.

Regression coverage includes existing-account reuse, sign-in followed by explicit consent, verification/token refresh without losing the draft, explicit resend, account changes, and recording shutdown/late microphone results after lock.

Operational email repair (2026-11-01): Firebase project `parentpulse-d68ba` used a failing custom Gmail SMTP relay. Changed only `notification.sendEmail.method` from `CUSTOM_SMTP` to `DEFAULT`; read-back confirmed other authentication settings were unchanged. Scott confirmed receiving and completing email verification afterward. No email-verification requirement was bypassed.


### Journal navigation while writing

Opening a journal no longer disables the header. The compact layout keeps the activity navigation visible and does not hide controls during saves. Activities, Your pages, Play together, Sign in, Editions, connections, settings, and Lock first ask the mounted editor to finish its save queue. Unfinished writing stays a draft; an untouched blank page is not created. Account/settings dialogs keep the editor mounted, and incoming sync/manual analysis remain paused while it is open. A failed save keeps the writer available for retry. Pending photo attachment or voice review keeps the page open with an explanation. Shared play still removes private content and requires unlocking before returning. Guided visits retain their existing Pause here behavior.

Regression coverage checks immediate navigation before debounce, slow earlier autosaves, a single lock after the newest write, retry after failure, sign-in with the draft intact, photo completion, and child journal privacy during shared play.


## Account-first family library (November 2026)

The default entry point is now sign-in and a family library. A verified adult account creates its own book and child profiles (name plus explicit age band), with no child email or password. New account books save automatically using the existing revision-checked encrypted sync transport. Persistent Firebase sign-in survives reload; explicit sign-out/Lock ends the session. Children use the parent's account password for the library gate, age changes and optional online-service authorization. The gate survives reload but is a shared-device UI safeguard, not a separate child identity or OS-level restriction.

Account-managed books have a random 256-bit recovery secret in `relish_sync/{uid}/access/{bookId}`. The verified token determines the UID; the server's `account-key` action retrieves only that owner's secret. Client Firestore reads remain denied. Keys never appear in library listings and cannot be replaced on an existing head. This is conventional account-recoverable storage, **not zero-knowledge encryption**. Anyone signed into the parent account can open that account's books; other accounts cannot. Removing a cloud book or deleting an account also removes its recovery secret.

Local-only and earlier passphrase-synced books remain supported. Opening them does not convert or upload them. “Add this book to my account” explicitly creates a separately encrypted copy of all entries/photos/progress and leaves the original intact. Account exports require an independent backup passphrase (also used for a restored child's parent gate). Account conflicts keep the device version as a separate online book before downloading the other version. AI consent and cross-account passage sharing remain explicit and separate from storage.

Validation includes component tests for password-free account opening, parent gating, child creation, and legacy opening; vault tests for non-destructive migration and photo re-encryption; and real Firebase checks in `scripts/verify-relish-sync.ts` for cross-account key/content isolation, direct Firestore denial, immutable keys, and deletion cleanup. Production deployment requires a separate approved merge of this change.
