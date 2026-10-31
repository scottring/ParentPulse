# Relish: the operating manual for relationships

Release scope: a fresh start with private local editions for adults and children, adult-only optional online accounts, chosen encrypted passage sharing, and family pass-and-play. Existing users do not need to migrate. The root and `/relish/` open the living book; legacy entry routes redirect there without changing legacy stored data.

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

Each edition opens at a personal bookmark. A short visit has an explicit purpose, estimated duration and finishing condition: choose a direction and notice a moment, plan a small practice, or return and keep an honest reflection. A visit completes only after the encrypted write succeeds. Private drafts and paused sessions can be resumed. Three chapters collect personal words, relationships and practices.

Two family games support 2–12 selected players, including guests. Players choose who starts and may pass. The handoff screen hides the preceding answer. Everyone must approve before a shared game page is kept; finishing without saving is valid. Private chapters and online sessions are put away during play. Returning to a private edition requires unlocking it. Game approvals are in-person choices, not authenticated signatures. Games are on one device, not remote multiplayer.

Finite page and cover transitions respect reduced-motion preferences. Stone-like sounds are synthesized locally, off by default, and stop when muted or the tab is hidden. These sounds use no microphone or remote sound files; optional voice writing has a separate explicit recording flow. The contextual guide is deterministic; optional AI is clearly identified separately.

## Separate local editions

A device can hold multiple independently encrypted editions. Each has its own passphrase and encrypted envelope. The original envelope key is retained for existing local books; new ones use a random identifier. Shelf labels and the sound preference are the only unencrypted app preferences. The sample edition is fictional and memory-only.

AES-GCM uses fresh random IVs. PBKDF2-SHA-256 with 600,000 iterations and a random salt derives a nonexportable encryption key. An unlocked key and book stay in memory. Idle timeout is ten minutes, reduced to one minute while hidden. Locking, switching editions, or detecting another tab's change removes decrypted state and ends online authentication.

Functional writes are serialized against the current book and protected by an origin-wide exclusive Web Lock. Envelope checks prevent stale-tab overwrite. Creation, restore, save and removal are guarded. A failed write does not advance a session. Restore validates the complete book, including living sessions, game approvals and connection records, and refuses to overwrite another edition. A restored backup can be added alongside other books.

Export encrypted backups regularly. Clearing browser data, losing a profile or forgetting a passphrase can make the book unavailable. Relish cannot recover its passphrase. Private books do not automatically synchronize: restoring a backup carries the edition and its sharing key to another device. This is browser storage, not a native macOS document or Keychain vault. An unlocked or compromised device, browser extension, or malicious same-origin script remains outside the encryption boundary. No independent security audit is claimed.

Removing a local edition requires unlocking it and typing its name. It removes only that device's copy; backups and online records are separate.

## Adult connected editions

Online accounts are intended for adults aged 18 and older. New account and edition connection flows require adult confirmation; this is self-confirmation, not identity or age verification. Children's editions stay local and can participate in family games. Each adult uses their own verified Firebase email/password account. Auth uses a named, Auth-only Firebase app with in-memory persistence and never initializes client Firestore.

Connecting explicitly publishes an edition name, a P-256 ECDH public key and its fingerprint. The corresponding private key is stored only inside the encrypted local book and backup. An account's key is immutable: use the matching backup to open it on another device. Members can compare fingerprints out of band.

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

General AI perspectives (including local Ollama) and online passage sharing remain unavailable in child editions. Parent-assisted voice and manual suggestions have separate controls: verified adult authentication, a local parent passphrase, explicit visit consent, age-appropriate manual prompting, and fail-closed provider privacy flags. No independent child account is created. Edition headers guard accidental/stale use, not verified age or device-wide restrictions.

Family play asks for the selected participants' age ranges. Unknown ranges use the simplest under-6 set. The youngest selected range determines new prompts and choices, capped by the hosting child edition's range even if its owner is not playing. A round stores its content version and audience with the encrypted game so choices and reveal text survive reload/restore. Older saved games retain the original wording. Other people's private editions are never opened to obtain their ages.


## Continuous pages, photos and voice

Your pages interleaves kept journal entries, guided moments, reflections, approved game pages and accepted passages chronologically. Editing preserves original placement; unfinished drafts remain separate. Private people tags are local metadata and never grant access. A chosen excerpt can enter the local Family album or prefill the existing encrypted adult-to-adult offer flow. Recipients still approve their copy. Photo sharing is local Family album only in this release.

Up to four photos per journal page are re-encoded as JPEG (long edge at most 1,600 pixels, at most 350 KB each), stripping embedded metadata. AES-GCM encryption uses the edition key and binds each blob to its photo ID. Ciphertext lives in IndexedDB, separate from the text envelope. Up to 200 referenced photos per edition are supported. Backup packages include all referenced ciphertext and allow at most 120 MB; the text envelope remains bounded at 12 MB. Restore authenticates all referenced media before writing it. Unreferenced encrypted blobs can remain until the local edition is removed. No photo is sent to AI.

Voice uses MediaRecorder, up to two minutes / 3 MB per take. The user reviews a take locally, explicitly sends that clip, then reviews/edits the transcript before insertion. Microphone tracks stop on completion, hiding or closing; late permission results and requests are cancelled. Audio is memory-only. The server validates origin, consent, verified adult authentication, type/magic bytes and streamed size before calling OpenAI audio transcriptions. Default model: `gpt-transcribe`; optional `RELISH_TRANSCRIPTION_MODEL`. Durable limits: 3/minute, 30/day/account, 300/day globally. No audio, transcript or journal context is logged/stored by Relish. Provider failures use generic errors and count toward quota.

## Automatic living manuals and provider setup

Manual analysis is off by default. An adult authorizes each unlocked visit, then separately enables personal and/or Family analysis. Only the six latest kept text sources (at most 1,800 characters each) are sent after changes. Drafts, photos/captions and private person tags are excluded. Family sources are only chosen album passages and approved game pages. The guide returns up to three tentative, source-cited ideas, never automatic accepted conclusions. Keep/dismiss decisions and source snapshots stay in the encrypted book. Only kept Family ideas appear in shared time. Disabling, signing out, editing or entering shared time cancels pending work; stale results cannot overwrite changed source context. Manual requests share the existing written-AI quota and use `store:false`.

Launch gates, false by default:
- `RELISH_VOICE_CHILDREN_ZDR_VERIFIED`: parent-assisted child dictation.
- `RELISH_MANUAL_ZDR_VERIFIED`: automatic manual analysis for all editions, since adult family writing may contain children’s personal data.

On October 31, the signed-in OpenAI Platform showed Personal / Default project and API-call logging controls, with no ZDR control. This does not establish that this account owns the hosting API key. Do not infer ZDR from API-call logging, `store:false`, or the transcription endpoint’s retention table. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) requires prior approval; [under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) requires ZDR before processing under-13 personal data. Verify approval and enablement for the exact project behind the deployed key before changing either flag. Then run synthetic provider checks and parent-assisted device verification before launch.

Prepared request for the account owner to submit to OpenAI’s sales contact (not sent):

> We are building Relish, a private family journaling and relationship-manual application. We request Zero Data Retention eligibility for the API project used by our hosted app, covering audio transcription and text-based manual suggestions. Children may participate under parent supervision, including under 13; independent online accounts are adult-only. We keep books and photos encrypted on family devices, send only explicitly authorized recordings or limited opted-in text, and require review before keeping suggestions or sharing passages. Please confirm eligibility, any additional requirements, and how to verify ZDR for the specific project and models before enabling these features.
