# Native release candidate — 2026-11-02

## Scope

Relish 1.0.0 (2), bundle `my.relish.book`, iOS 27.1+, iPhone and iPad. The native app loads the production account-first family library. Outer-screen capture becomes an inner-screen spread without losing the draft. This is a release candidate, not a claim of TestFlight availability.

## Distribution record

- Team: Scott Kaufman, `XT33G7U496`.
- Distribution certificate exists and expires June 15, 2027.
- After the owner refreshed Xcode sign-in and accepted Apple’s updated Program License Agreement, the signed archive and App Store Connect IPA export succeeded. Both passed local signature, profile, identity and file-protection checks. The exported IPA has an App Store profile and debugging disabled.
- Export logged an App Store Connect session warning despite completing successfully. Apple server validation and build-history checks are still pending; local export is not upload acceptance.
- A physical iPhone Duo with iOS 27.2 is paired. Developer Mode was off when inspected. Do not change it remotely; direct development installation requires the owner to enable it. Installing a processed TestFlight build avoids that development-install requirement.
- App Store Connect is authenticated in the in-app browser. No Relish app appears in the app list; the registered `my.relish.book` bundle is available for a new app. The app record has not been created. Apple displays a separate updated Paid Applications Schedule notice and an EU trader-status notice; the account holder must handle applicable agreements before public submission.
- No archive was uploaded, no tester was invited, and no App Store release was submitted.

## Included

- Production URL in Debug and Release; local/preview overrides confined to Debug and validated against known origins.
- Native light/dark/tinted icon assets, launch colors, version/build settings, team selection and export recipe.
- Complete default file protection and the existing protected temporary backup exports.
- Privacy manifest covers the hosted account experience, not merely the Swift code.
- Direct labels and instructions across journals, guided sessions, account setup, games, sharing, voice entry and AI suggestions. Previous-entry panels no longer contain decorative advice.
- Native tests for URL, download and permission boundaries; an archive checker that distinguishes unsigned compilation from signed distribution readiness.

## App Store Connect preparation

Proposed name: **Relish — Family Journal** (confirm availability before saving).
Subtitle: **Journals, photos and games**.
Primary category: Lifestyle. The account holder is an adult; children use parent-managed profiles. Do not select the Kids Category or claim unrestricted child AI. Complete Apple's age-rating questionnaire from the actual features; do not infer a numeric rating from the youngest profile age.
Privacy URL: https://app.relish.my/privacy/
Beta description: Relish is a private family library for journal entries, photos, guided reflection and shared games. Each person has a book. On iPhone Duo, capture a moment on the outer display, then unfold into a full spread. Entries saved to your parent account are available on other signed-in devices. Children use parent-managed profiles; sharing and online AI are optional.
What to test: sign in; create an adult book and a child profile; write a sentence on the outer display; unfold/rotate/fold with the keyboard open; save the entry once; open that book on another device; add a photo; review a voice transcription; export and restore a backup; lock/reopen; confirm parent controls and accessibility.

The review contact, feedback email and any reviewer credentials must be entered privately in App Store Connect. Provision a dedicated fictional reviewer family when review is scheduled; never use real family entries or commit credentials. Public support URL and screenshots must be confirmed before public submission. Internal TestFlight is the first distribution target.

## Privacy answers to carry into App Store Connect

No advertising or cross-app tracking. Account-linked data used for app functionality: email, profile names, account identifiers, saved photos, journal/manual text, gameplay content, selected messages/passages, age bands/family metadata, progress/usage counters and operational diagnostics. Optional manual suggestions also personalize content. These declarations include the hosted web experience and providers; an encrypted account book is recoverable by its parent account and service, so do not label it zero-knowledge.

Raw voice takes are only processed for the immediate reviewed transcription request; they are not persisted in the book or by Relish. The configured transcription endpoint documents no retained audio. Do not describe this as project-wide Zero Data Retention. Optional adult text analysis can have provider abuse-monitoring retention. Child automatic analysis remains disabled without verified provider ZDR. No camera/microphone data goes to a provider before the in-app permission/review step. Photos are not analyzed by AI.

The native target directly uses no required-reason APIs. System frameworks manage their own WebKit storage. Reassess the manifest if adding UserDefaults, file timestamp queries, device fingerprinting, native SDKs, tracking or persistent voice storage. No privacy answers have been submitted to Apple yet.

## Encryption declaration rationale

The native app links Apple frameworks only. TLS and the hosted vault's AES-GCM/PBKDF2/RSA/ECDSA operations use Apple's WebKit Web Crypto implementation; no independent cryptographic library is bundled. `ITSAppUsesNonExemptEncryption = NO` reflects Apple's OS-only documentation exemption, not “no encryption.” Reassess when adding a cryptographic implementation or changing distribution. Apple may still ask country-specific questions; this is not a guarantee about requirements outside App Store Connect.

## Acceptance evidence

- [x] Six native XCTest checks passed on the iPhone Duo / iOS 27.1 simulator.
- [x] Unsigned iOS Release archive compiles with Xcode 27.2.
- [x] Signed archive and exported IPA checker; unsigned archive correctly rejected by `--signed`.
- [x] Native signed-in outer → inner → outer journal capture in a parent-managed child book; save once, then verify the entry appears exactly once in a separate production browser client. Only a fictional family was used.
- [ ] Native account and encrypted backup share sheet.
- [ ] Physical camera, microphone, permission denial and interruption recovery.
- [ ] Physical Dynamic Type/VoiceOver and outer/inner keyboard checks.
- [x] Signed Release archive and App Store Connect IPA exported locally.
- [ ] Apple server validation, TestFlight processing and install.
- [ ] Approved changes merged to origin/main before distribution.

## Apple references

- [Duo layout guidance](https://developer.apple.com/iphone-duo/prepare/)
- [Privacy labels, including hosted web views](https://developer.apple.com/app-store/app-privacy-details/)
- [Privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [OS-only encryption documentation exemption](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/)
- [App Store Connect build upload](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
