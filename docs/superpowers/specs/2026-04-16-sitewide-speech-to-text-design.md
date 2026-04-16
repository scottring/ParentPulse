# Sitewide Speech-to-Text — Design Spec

**Date:** 2026-04-16
**Status:** Approved (brainstorming complete, ready for implementation plan)

## Goal

Add a clickable microphone icon to every text entry field across the app so users can dictate journal entries, margin notes, chat replies, and form answers instead of typing. The feature is additive — typing always works; voice is a faster alternative when convenient (one-handed with a baby, walking, end-of-day in bed).

## Why this fits the product

The "minimal effort" memory says the app must not be a chore — voice removes the typing tax that makes journaling feel like work. The "living document" principle says inputs should invite returning thoughts; appending dictated speech to existing text supports that flow.

## Decisions locked

| Decision | Choice | Why |
|----------|--------|-----|
| Transcription engine | OpenAI Whisper API via Firebase Function | Uniform behavior across browsers (esp. iOS Safari), strong accuracy, $0.006/min |
| Interaction model | Tap to start, tap to stop (with safety auto-stops) | Familiar from iMessage/WhatsApp, works on touch and mouse |
| Existing-text behavior | Append (with separating space) | Matches "keep adding thoughts" journal pattern |
| Component architecture | Standalone `<MicButton>` dropped at each call site | Same touch count as a wrapper, but each edit is mechanical and preserves bespoke styling per field |

## Component contract

```tsx
<MicButton
  onTranscript={(text) => setValue(prev => prev ? `${prev} ${text}` : text)}
  size="sm"            // 'sm' | 'md'
  disabled={isUploading}
  className="..."      // optional positioning
/>
```

- `onTranscript(text)`: called once per recording with final transcribed text. Caller owns insertion logic.
- `size`: `sm` = 24 px tap target, 14 px glyph (margin notes, chat). `md` = 36 px tap target, 18 px glyph (capture, modals).
- `disabled`: parent-driven disable.
- `className`: positioning override for in-field placement.

Internal state machine: `idle → requesting-permission → recording → transcribing → idle` (+ `error` branch). Caller never sees these.

No styling props beyond `size` + `className` — the visual language stays consistent everywhere.

## Recording & upload flow

**Client (inside `MicButton` / `useAudioRecording` hook):**

1. On tap: `navigator.mediaDevices.getUserMedia({ audio: true })`.
2. `MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })`. Fallback to `audio/mp4` if webm unsupported (older iOS).
3. Collect chunks via `ondataavailable`. On stop, assemble into a single `Blob`.
4. POST blob to `transcribeAudio` callable Function with Firebase ID token.
5. Stop all tracks (`stream.getTracks().forEach(t => t.stop())`) to release mic and clear browser indicator.
6. On response, call `onTranscript(text)`.

**Server — new Cloud Function `transcribeAudio`:**

1. Verify Firebase ID token. Reject anonymous.
2. Check per-user rate limit (see Guardrails).
3. Forward audio to OpenAI Whisper (`whisper-1`, `response_format: 'text'`, `language: 'en'`).
4. Return `{ text: string }`.
5. Log `{ uid, durationSec, costCents, timestamp }` to `transcription_logs` collection.

**Audio specs:** Opus in webm, 16 kHz mono. Max blob size ~2 MB (covers 90 s comfortably; well under Whisper's 25 MB limit).

**Secrets:** OpenAI key via Firebase Functions secret (`firebase functions:secrets:set OPENAI_API_KEY`). Never in client code.

**iOS Safari:** `MediaRecorder` with webm/opus works on Safari 16+. Older iOS gets the mp4 fallback. Whisper accepts both.

## Visual states

| State | Visual |
|-------|--------|
| Idle | Earth-tone mic glyph (`#8a6f4a`). No animation. Cursor pointer. Desktop tooltip: "Speak to transcribe" |
| Requesting permission | Same glyph + soft 600ms spinner ring. Brief on first use, instant thereafter |
| Recording | Coral mic (`#C97B63`, "Needs attention" workbook color). Soft 1.0→1.08→1.0 pulse on 1.2 s loop. Tiny coral timer next to mic showing elapsed seconds |
| Transcribing | Earth-tone glyph + opacity shimmer (0.4→1.0, 800 ms). Button disabled |
| Error | Muted gray glyph + small `!` badge top-right. Click shows inline message in field's normal error style |

**No waveform** — feels surveillance-y and adds motion noise on a phone.
**No custom permission modal** — let the browser's native prompt handle it; pre-explaining creates two dialogs.

**Error messages:**
- Permission denied → "Turn on microphone access in browser settings."
- Network/server error → "Couldn't transcribe. Tap again to retry."
- Rate-limited → "Too many recordings. Try again in a minute."
- Empty result → "No speech detected — try again."

Error auto-clears on next tap.

**Accessibility:**
- `aria-label` updates per state ("Start voice input" / "Recording — tap to stop" / "Transcribing…" / "Voice input failed").
- `aria-live="polite"` on the timer.
- Space/Enter toggles like click.

## Cost & safety guardrails

**Three layers:**

1. **Hard max duration: 90 s per recording.** Auto-stop with toast: "Recording stopped at 1:30 — tap mic to continue." Caps worst-case cost per recording at $0.009.
2. **Silence auto-stop: 30 s.** Measured via `AnalyserNode` RMS < 0.01. Catches "started recording, walked away." Forgiving enough that 2–8 s thinking pauses don't trigger it.
3. **Per-user rate limit: 30 minutes/day.** Tracked in `rate_limits/{uid}` Firestore doc, rolling 24 h window. Enforced in `transcribeAudio`. Far above legitimate use; protects against abuse.

**Budget visibility:** every transcription logged to `transcription_logs` for daily cost queries.

**Fail-safe:** if Cloud Function or Whisper is down, error path kicks in and the user can still type. Voice is always additive, never required.

**Explicitly NOT doing:** no client-side audio validation (no "your mic is too quiet" warnings) — too error-prone. Empty transcription just shows "No speech detected."

## Rollout — five waves, each independently shippable

**Wave 1 — Foundations (no UI changes).**
- `<MicButton>` component + `useAudioRecording()` hook.
- `transcribeAudio` Cloud Function + rate-limit doc schema.
- `OPENAI_API_KEY` Functions secret.
- Unit tests for state machine (mock MediaRecorder).
- Dev-only `/dev/voice-test` playground page.
- Done when: record on playground, get text back.

**Wave 2 — Capture sheet (priority surface).**
- `CaptureSheet.tsx` main textarea (~line 508, size `md`) + follow-up chat input (~line 775, size `sm`).
- Hand-test desktop Chrome, Safari, iOS Safari.
- Done when: capture flow works end-to-end with voice.

**Wave 3 — Margin notes + journal-adjacent surfaces.**
- `MarginNoteComposer.tsx` (size `sm`, inline right of composer).
- `AskAboutEntrySheet` follow-up chat.
- `ManualChat.tsx`.
- Done when: all journal-adjacent entry fields accept voice.

**Wave 4 — Modal forms.**
- `AddTriggerModal`, `AddStrategyModal`, `AddBoundaryModal` (4 textareas each).
- `QuestionRenderer.tsx` (onboarding open-response).
- `QualitativeComment.tsx`.
- Done when: all structured-data entry flows accept voice.

**Wave 5 — Sweep + cleanup.**
- Grep-driven sweep of remaining `<input type="text">` and `<textarea>`.
- Skip: PIN inputs (security), search bars (voice search isn't user expectation), file name/URL fields, hidden inputs.
- Remove `/dev/voice-test`.
- Document the convention: "every text field gets a MicButton; exceptions listed here."

## Non-goals (explicit, for this spec)

- No live/progressive transcription. Whisper is file-based; swap engines later if needed.
- No voice commands ("submit", "new line") — plain transcription only.
- No multilingual — English only at launch. Adding is a `language` param change.
- No audio playback / review before transcribing — trust the first pass.
- No shared `<VoiceInput>` wrapper component — `<MicButton>` next to existing inputs is the chosen architecture. Wrapper can be introduced later without blocking this work.

## Files touched (estimate)

- New: `src/components/voice/MicButton.tsx`, `src/components/voice/useAudioRecording.ts`, `functions/src/transcribeAudio.ts`, `firestore.rules` (rate-limits + logs), `src/app/dev/voice-test/page.tsx` (temporary).
- Modified across waves 2–5: ~20–25 component files (only the subset of the 59 raw inputs that are user-facing text entry; PIN/search/etc. excluded).

## Success criteria

- Voice works on Chrome, Safari, Firefox, and iOS Safari.
- Per-recording cost capped at $0.009 by hard 90 s limit.
- Per-user daily cap enforced at the Function layer.
- All states communicate clearly without text labels (mic color/animation alone tells the story).
- Voice is additive: every field still accepts typing; mic failure never blocks the user.
