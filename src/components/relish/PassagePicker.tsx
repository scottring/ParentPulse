"use client";
import { useState } from "react";
import { Check, Send, Users } from "lucide-react";
import { Dialog } from "./BookForms";
import { PhotoImage } from "./Photos";
import { keepAlbumPassage, type BookPage } from "@/lib/relish/pages";
import type { Book } from "@/lib/relish/model";
import type { PhotoAccess } from "@/lib/relish/photos";

export default function PassagePicker({
  page,
  selected,
  save,
  photos,
  onOffer,
  onClose,
}: {
  page: BookPage;
  selected: string;
  save: (change: (book: Book) => Book) => Promise<void>;
  photos?: PhotoAccess;
  onOffer?: (passage: { title: string; text: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(page.title),
    [text, setText] = useState(selected.slice(0, 8000));
  const [chosen, setChosen] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const hasContent = !!text.trim() || chosen.length > 0;
  async function keep() {
    setBusy(true);
    setError("");
    try {
      await save((b) =>
        keepAlbumPassage(
          b,
          page,
          title,
          text,
          page.photos.filter((p) => chosen.includes(p.id)),
        ),
      );
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The passage couldn’t be kept. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Choose a passage" onClose={busy ? () => {} : onClose}>
      {done ? (
        <>
          <p className="lb-kicker">A little piece, shared</p>
          <h2>In the Family album.</h2>
          <p>
            Only the words and photos you chose are there. Your original page
            stays private.
          </p>
          <button className="lb-primary" onClick={onClose}>
            Back to my book <Check size={18} />
          </button>
        </>
      ) : (
        <>
          <p className="lb-kicker">You choose what travels</p>
          <h2>
            A few lines can
            <br />
            mean a lot.
          </h2>
          <p>
            Select lines on your page before opening this, or copy the words you
            want into the space below.
          </p>
          <label className="rj-field">
            Passage title
            <input
              value={title}
              maxLength={120}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="rj-field">
            Only these words
            <textarea
              rows={6}
              value={text}
              maxLength={8000}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              placeholder="Choose a little piece of your page…"
            />
          </label>
          {photos && page.photos.length > 0 && (
            <fieldset className="rj-passage-photos" disabled={busy}>
              <legend>Include a photo in the Family album?</legend>
              {page.photos.map((p) => (
                <label key={p.id}>
                  <PhotoImage photo={p} access={photos} />
                  <span>
                    <input
                      type="checkbox"
                      checked={chosen.includes(p.id)}
                      onChange={(e) =>
                        setChosen(
                          e.target.checked
                            ? [...chosen, p.id]
                            : chosen.filter((id) => id !== p.id),
                        )
                      }
                    />{" "}
                    {p.caption || "Include this photo"}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <p className="lb-fine">
            Family album: visible during shared time on this device. Connected
            editions: you choose recipients next; each person decides whether to
            keep the passage. Private people tags stay behind.
          </p>
          {error && (
            <p className="lb-error" role="alert">
              {error}
            </p>
          )}
          <div className="rj-capture-actions">
            <button
              className="lb-primary"
              disabled={busy || !hasContent}
              onClick={() => void keep()}
            >
              <Users size={18} />
              {busy ? "Keeping…" : "Add to Family album"}
            </button>
            {onOffer && (
              <button
                className="lb-secondary"
                disabled={busy || !text.trim() || chosen.length > 0}
                onClick={() => onOffer({ title, text })}
              >
                <Send size={17} /> Offer words to another edition
              </button>
            )}
          </div>
          {chosen.length > 0 && onOffer && (
            <p className="lb-fine">
              Photo sharing is available in the Family album on this device.
              Online passages carry only the words you choose.
            </p>
          )}
        </>
      )}
    </Dialog>
  );
}
