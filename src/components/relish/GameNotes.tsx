"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { currentAIUser } from "@/lib/relish/ai-auth";
import {
  answerLines,
  kindLabels,
  notesFromAnswers,
  type NoteDraft,
} from "@/lib/relish/game-notes";
import type { Game } from "@/lib/relish/living";
import { forgetTranscript, isChildPlayer, transcriptOf, type Listen } from "./GameListen";

export type NotesConfig = { enabled: boolean; children: boolean };

/** Whether this journal can take notes from what's said aloud in this round. */
export function useNotesConfig(skip: boolean) {
  const [config, setConfig] = useState<NotesConfig | null>(null);
  useEffect(() => {
    if (skip) return;
    const controller = new AbortController();
    fetch("/api/relish/notes/", { signal: controller.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c && setConfig({ enabled: !!c.enabled, children: !!c.children }))
      .catch(() => {});
    return () => controller.abort();
  }, [skip]);
  return config;
}
export const canListen = (game: Game, config: NotesConfig | null) =>
  !!config?.enabled && (config.children || !game.players.some(isChildPlayer));

/**
 * The end of a round: what came out of it about each player, from the typed
 * answers and (with Listen) what was said. Everything starts checked; one tap
 * keeps them on each person in this journal.
 */
export default function GameNotes({
  game,
  owner,
  config,
  listen,
  busy,
  onKeep,
}: {
  game: Game;
  owner: string;
  config: NotesConfig | null;
  listen: Listen | null;
  busy: boolean;
  onKeep: (notes: NoteDraft[]) => Promise<boolean>;
}) {
  const typed = useMemo(() => notesFromAnswers(game), [game]);
  const [said, setSaid] = useState<NoteDraft[]>([]);
  const [off, setOff] = useState<Set<number>>(new Set());
  const [state, setState] = useState<"idle" | "reading" | "read" | "kept">("idle");
  const [error, setError] = useState("");
  const asked = useRef(false);
  const transcript = transcriptOf(game.id);
  const listening = !!listen && listen.state !== "off";
  const waiting = listening || (listen?.pending ?? 0) > 0;
  const childPlaying = game.players.some(isChildPlayer);
  const aiOk = canListen(game, config);

  useEffect(() => {
    if (asked.current || waiting || !transcript.trim() || !aiOk) return;
    asked.current = true;
    const user = currentAIUser();
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the one request
    setState("reading");
    void (async () => {
      try {
        const response = await fetch("/api/relish/notes/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
            "x-relish-consent": "game-notes",
            "x-relish-edition": "adult",
          },
          body: JSON.stringify({
            players: game.players.map((p) => ({ name: p.name, child: isChildPlayer(p) })),
            answers: answerLines(game),
            transcript,
          }),
          signal: AbortSignal.timeout(55_000),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(result.notes))
          throw new Error(result.error || "Notes from what was said couldn’t be written.");
        setSaid(result.notes);
        setState("read");
      } catch (e) {
        setError(
          e instanceof Error && e.name !== "TimeoutError"
            ? e.message
            : "Notes from what was said took too long. The typed answers are still here.",
        );
        setState("idle");
      }
    })();
  }, [waiting, transcript, aiOk, game]);

  // Notes are about the people you play with, kept in your journal under each
  // of them; the book's owner isn't one of their own people.
  const mine = (n: NoteDraft) => n.person.trim().toLowerCase() !== owner.trim().toLowerCase();
  const all = [...typed, ...said].filter(mine);
  const chosen = all.filter((_, i) => !off.has(i));
  const people = game.players.map((p) => p.name);
  if (state === "kept")
    return (
      <section className="lb-notes" aria-label="Notes from this round">
        <p className="lb-kicker">Notes from this round</p>
        <p>
          <Check size={16} aria-hidden="true" /> Kept in {owner}’s journal, under each person. Only
          the parents’ books hold these notes.
        </p>
      </section>
    );
  return (
    <section className="lb-notes" aria-label="Notes from this round">
      <p className="lb-kicker">Notes from this round</p>
      <h3>What we learned</h3>
      {waiting ? (
        <p className="lb-fine">
          {listening
            ? "Still listening. Stop Listen to add what was said to these notes."
            : "Writing down what was said…"}
        </p>
      ) : state === "reading" ? (
        <p className="lb-fine" role="status">
          Reading what was said…
        </p>
      ) : null}
      {!all.length && state !== "reading" && !waiting ? (
        <p className="lb-fine">Nothing to note from this round.</p>
      ) : (
        people.map((name) => {
          const mine = all
            .map((n, i) => ({ n, i }))
            .filter(({ n }) => n.person === name);
          if (!mine.length) return null;
          return (
            <fieldset key={name} className="lb-notes-person">
              <legend>{name}</legend>
              {mine.map(({ n, i }) => (
                <label key={i} className="lb-note">
                  <input
                    type="checkbox"
                    checked={!off.has(i)}
                    onChange={() =>
                      setOff((s) => {
                        const next = new Set(s);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                  />
                  <span>
                    <small>
                      {kindLabels[n.kind]}
                      {n.about ? ` · about ${n.about}` : ""}
                      {n.from === "said" ? " · said aloud" : ""}
                    </small>
                    {n.text}
                  </span>
                </label>
              ))}
            </fieldset>
          );
        })
      )}
      {childPlaying && !config?.children && (
        <p className="lb-fine">
          Notes from what children say aloud need an extra privacy setup with the AI provider,
          so Listen is off in rounds with children. Their typed answers are noted here.
        </p>
      )}
      {error && (
        <p className="lb-error" role="alert">
          {error}
        </p>
      )}
      {all.length > 0 && (
        <div className="lb-actions">
          <button
            type="button"
            className="lb-primary"
            disabled={busy || !chosen.length || state === "reading" || waiting}
            onClick={() =>
              void onKeep(chosen).then((ok) => {
                if (!ok) return;
                forgetTranscript(game.id);
                setState("kept");
              })
            }
          >
            Keep {chosen.length} {chosen.length === 1 ? "note" : "notes"}
          </button>
          <span className="lb-fine">In {owner}’s journal, under each person. Not shared.</span>
        </div>
      )}
    </section>
  );
}
