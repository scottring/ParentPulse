"use client";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { Lock, RefreshCw, Send, Users, BookOpen, Check } from "lucide-react";
import { Dialog } from "./BookForms";
import type { Book } from "@/lib/relish/model";
import {
  canonicalKey,
  decryptPassage,
  encryptPassage,
  makeIdentity,
  keyFingerprint,
  type ConnectionSnapshot,
  type Delivery,
  type Outgoing,
} from "@/lib/relish/sharing";
import { bookPages } from "@/lib/relish/pages";
import { canUseOnline } from "@/lib/relish/profiles";
type Save = (change: (b: Book) => Book) => Promise<void>;
type Props = {
  book: Book;
  save: Save;
  backup: () => void;
  onClose: () => void;
  initialPassage?: { title: string; text: string };
};
export default function ConnectedEditions(props: Props) {
  if (!canUseOnline(props.book))
    return (
      <Dialog title="Local edition" onClose={props.onClose}>
        <h2>A book kept here.</h2>
        <p>
          Online connections are available only in adult editions. Children can
          use their written guide and play together on this device.
        </p>
      </Dialog>
    );
  return <AdultConnectedEditions {...props} />;
}
function AdultConnectedEditions({
  book,
  save,
  backup,
  onClose,
  initialPassage,
}: {
  book: Book;
  save: Save;
  backup: () => void;
  onClose: () => void;
  initialPassage?: { title: string; text: string };
}) {
  const [user, setUser] = useState<User | null>(null),
    [snapshot, setSnapshot] = useState<ConnectionSnapshot | null>(null);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [create, setCreate] = useState(false),
    [adult, setAdult] = useState(false),
    [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [familyName, setFamilyName] = useState("Our family"),
    [joinCode, setJoinCode] = useState(""),
    [invite, setInvite] = useState(""),
    [joinName, setJoinName] = useState("");
  const [title, setTitle] = useState(
      initialPassage?.title ||
        book.connections?.draft?.title ||
        "A passage from my edition",
    ),
    [text, setText] = useState(
      initialPassage?.text || book.connections?.draft?.text || "",
    ),
    [recipients, setRecipients] = useState<string[]>([]);
  const [opened, setOpened] = useState<{
    delivery: Delivery;
    title: string;
    text: string;
  } | null>(null);
  const alive = useRef(true),
    operation = useRef(false),
    abort = useRef(new AbortController());
  useEffect(() => {
    alive.current = true;
    const pending = new AbortController();
    abort.current = pending;
    let unsubscribe: undefined | (() => void);
    Promise.all([import("@/lib/relish/ai-auth"), import("firebase/auth")])
      .then(([a, f]) => {
        if (!alive.current) return;
        unsubscribe = f.onAuthStateChanged(a.getAIAuth(), (next) => {
          setUser(next);
          setSnapshot(null);
          setOpened(null);
        });
      })
      .catch(() => {
        if (alive.current)
          setError(
            "Online connections are unavailable. Your local edition is still here.",
          );
      });
    return () => {
      alive.current = false;
      pending.abort();
      unsubscribe?.();
    };
  }, []);
  async function api(data: Record<string, unknown>, account = user) {
    if (!account || !account.emailVerified)
      throw new Error("Verify your email to connect editions.");
    const token = await account.getIdToken();
    if (abort.current.signal.aborted)
      throw new Error("This edition was closed.");
    const res = await fetch("/api/relish/connections/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-relish-consent": "chosen-connection",
        "x-relish-edition": "adult",
      },
      body: JSON.stringify(data),
      signal: abort.current.signal,
    });
    const result = await res.json();
    if (!res.ok)
      throw new Error(result.error || "The connection is unavailable.");
    return result;
  }
  async function run(work: () => Promise<unknown>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function refresh() {
    const next = (await api({ action: "list" })) as ConnectionSnapshot;
    if (alive.current) {
      setSnapshot(next);
      setTick((n) => n + 1);
    }
    return next;
  }
  async function connectEdition() {
    if (!user) return;
    if (!adult)
      throw new Error(
        "Online connections are for adults. Children’s editions can stay on the family’s device.",
      );
    const next = await refresh();
    let identity = book.connections?.identity;
    if (identity && identity.uid !== user.uid)
      throw new Error(
        "This edition belongs to a different online account. Sign in with its account, or open another edition.",
      );
    if (
      next.profile &&
      (!identity ||
        (await keyFingerprint(identity.publicKey)) !== next.profile.keyId)
    )
      throw new Error(
        "This account already has an edition. Restore that edition’s encrypted backup from the bookshelf to connect it on this device.",
      );
    if (!identity) {
      identity = await makeIdentity(user.uid);
      const created = identity;
      await save((b) => ({
        ...b,
        connections: {
          ...(b.connections || { received: [] }),
          identity: created,
        },
      }));
    }
    await api({
      action: "register",
      name: book.owner,
      publicKey: identity.publicKey,
      adultConfirmed: true,
    });
    await refresh();
    setNotice(
      "Your edition is connected. Export a fresh encrypted backup so its sharing key travels with you.",
    );
  }
  async function signIn() {
    const { connectAI } = await import("@/lib/relish/ai-auth");
    if (create && !adult)
      throw new Error(
        "Online accounts are for adults. Children can use local editions.",
      );
    await connectAI(email, password, create);
    setPassword("");
    setNotice(
      create
        ? "Open the verification link in your email, then return here."
        : "Signed in. Connect this private edition when you’re ready.",
    );
  }
  async function disconnect() {
    const { disconnectAI } = await import("@/lib/relish/ai-auth");
    await disconnectAI();
    setSnapshot(null);
    setOpened(null);
    setInvite("");
    setNotice("Online session ended. Your private edition stays here.");
  }
  const identity = book.connections?.identity;
  const connected = !!(
    user &&
    identity?.uid === user.uid &&
    snapshot?.profile &&
    canonicalKey(identity.publicKey) ===
      canonicalKey(snapshot.profile.publicKey)
  );
  const circle = connected ? snapshot?.circle : null;
  const others = circle?.members.filter((m) => m.uid !== user?.uid) || [];
  const owner = circle?.ownerId === user?.uid;
  const sources = bookPages(book)
    .filter((p) => p.text.trim())
    .map((p) => ({ id: p.id, label: p.title, text: p.text }));
  async function sendPrepared(outgoing: Outgoing) {
    await api({
      action: "send",
      id: outgoing.id,
      recipients: outgoing.recipients,
      packets: outgoing.packets,
    });
    await save((b) => ({
      ...b,
      connections: {
        ...b.connections!,
        outgoing: (b.connections?.outgoing || []).map((o) =>
          o.id === outgoing.id ? { ...o, sent: true, packets: {} } : o,
        ),
      },
    }));
    await refresh();
    setNotice(
      "Your passage was offered. Each person chooses whether to keep it in their edition.",
    );
  }
  async function send() {
    if (!circle || !user) return;
    const chosen = others.filter((m) => recipients.includes(m.uid));
    if (!chosen.length || !text.trim())
      throw new Error("Choose a passage and at least one edition.");
    const id = crypto.randomUUID();
    const packets = Object.fromEntries(
      await Promise.all(
        chosen.map(async (m) => [
          m.uid,
          await encryptPassage(
            { title: title.trim(), text: text.trim() },
            m,
            id,
            circle.id,
            user.uid,
          ),
        ]),
      ),
    );
    const outgoing: Outgoing = {
      id,
      circleId: circle.id,
      title: title.trim(),
      text: text.trim(),
      recipients: chosen.map((m) => m.uid),
      packets,
      createdAt: new Date().toISOString(),
      sent: false,
    };
    await save((b) => ({
      ...b,
      connections: {
        ...b.connections!,
        outgoing: [...(b.connections?.outgoing || []), outgoing],
        draft: initialPassage ? b.connections?.draft : undefined,
      },
    }));
    setText("");
    setRecipients([]);
    await sendPrepared(outgoing);
  }
  async function inspect(delivery: Delivery) {
    if (!delivery.packet || !identity)
      throw new Error("This invitation is no longer available.");
    const passage = await decryptPassage(delivery.packet, identity, delivery);
    setOpened({ delivery, ...passage });
  }
  async function accept() {
    if (!opened) return;
    const passage = opened;
    await save((b) => ({
      ...b,
      connections: {
        ...b.connections!,
        received: b.connections!.received.some(
          (p) => p.id === passage.delivery.id,
        )
          ? b.connections!.received
          : [
              ...b.connections!.received,
              {
                id: passage.delivery.id,
                title: passage.title,
                text: passage.text,
                from: passage.delivery.sender,
                fromName: passage.delivery.senderName,
                createdAt: passage.delivery.createdAt,
                acceptedAt: new Date().toISOString(),
              },
            ],
      },
    }));
    await api({
      action: "receipt",
      id: passage.delivery.id,
      status: "accepted",
    });
    setOpened(null);
    await refresh();
    setNotice(
      "Kept in your private edition, with its author’s name. That is enough for this visit.",
    );
  }
  async function closeWithDraft() {
    if (busy) return;
    await run(async () => {
      if ((!initialPassage || !book.connections?.draft) && (text || book.connections?.draft))
        await save((b) => ({
          ...b,
          connections: {
            ...b.connections,
            received: b.connections?.received || [],
            draft: text ? { title, text } : undefined,
          },
        }));
      onClose();
    });
  }
  return (
    <Dialog
      title="Connected editions"
      wide
      onClose={() => void closeWithDraft()}
    >
      <section className="lb-connections" data-verification={tick}>
        <p className="lb-kicker">Books that speak to one another</p>
        <h2>Connected by choice.</h2>
        <p>
          Keep your private book here. Offer a chosen passage to someone you
          love; they decide whether it belongs in their edition.
        </p>
        <details className="lb-boundary">
          <summary>
            <Lock size={15} /> How this connection stays private
          </summary>
          <p>
            Only selected passages are encrypted and uploaded. Your full book,
            passphrase and private key stay on this device. Relish stores
            account details, edition names, family membership, delivery status
            and encrypted passages.
          </p>
          <p className="lb-fine">
            A saved copy belongs to its recipient. Withdrawing an invitation or
            leaving a family cannot erase copies someone already kept.
          </p>
        </details>
        {error && (
          <p className="lb-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="lb-kept">
            {notice}
          </p>
        )}
        {!user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(signIn);
            }}
            className="r-form"
          >
            <h3>
              {create
                ? "Create an optional online account"
                : "Sign in to connect editions"}
            </h3>
            <p className="lb-fine">
              Each person uses their own account. Children can keep a local
              edition and play together without an online account.
            </p>
            <label>
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={254}
              />
            </label>
            <label>
              Online account password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={create ? "new-password" : "current-password"}
                minLength={create ? 12 : 1}
                maxLength={128}
              />
            </label>
            <p className="lb-fine">
              Use a different password from your private book’s passphrase.
            </p>
            {create && (
              <label className="lb-consent-check">
                <input
                  type="checkbox"
                  checked={adult}
                  onChange={(e) => setAdult(e.target.checked)}
                />
                I’m 18 or older.
              </label>
            )}
            <button
              className="lb-primary"
              disabled={busy || (create && !adult)}
            >
              {busy ? "Connecting…" : create ? "Create account" : "Sign in"}
            </button>
            <button
              type="button"
              className="lb-text"
              disabled={busy}
              onClick={() => setCreate(!create)}
            >
              {create ? "I already have an account" : "Create an account"}
            </button>
            {!create && (
              <button
                type="button"
                className="lb-text"
                disabled={busy || !email.includes("@")}
                onClick={() =>
                  void run(async () => {
                    const [a, f] = await Promise.all([
                      import("@/lib/relish/ai-auth"),
                      import("firebase/auth"),
                    ]);
                    await f.sendPasswordResetEmail(a.getAIAuth(), email);
                    setNotice(
                      "If that account exists, a password-reset link will arrive by email.",
                    );
                  })
                }
              >
                Forgot account password
              </button>
            )}
          </form>
        ) : (
          <>
            <div className="lb-account-line">
              <span>Signed in as {user.email}</span>
              <button
                className="lb-text"
                disabled={busy}
                onClick={() => void run(disconnect)}
              >
                Sign out
              </button>
            </div>
            {!user.emailVerified ? (
              <div className="lb-boundary">
                <h3>Verify your email first.</h3>
                <p>Open the link in your inbox, then come back.</p>
                <button
                  className="lb-primary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await user.reload();
                      await user.getIdToken(true);
                      setTick((n) => n + 1);
                      setNotice(
                        user.emailVerified
                          ? "Email verified. You can connect this edition."
                          : "Your email has not been verified yet.",
                      );
                    })
                  }
                >
                  I’ve verified my email
                </button>
                <button
                  className="lb-text"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const { sendEmailVerification } =
                        await import("firebase/auth");
                      await sendEmailVerification(user);
                      setNotice("A verification link is on its way.");
                    })
                  }
                >
                  Send another verification link
                </button>
              </div>
            ) : !connected ? (
              <div className="lb-boundary">
                <h3>Connect the {book.owner} edition</h3>
                <p>
                  This publishes your edition name and public sharing key. It
                  does not upload your writing. Keep an encrypted backup to open
                  this same edition on another device.
                </p>
                <label className="lb-consent-check">
                  <input
                    type="checkbox"
                    checked={adult}
                    onChange={(e) => setAdult(e.target.checked)}
                  />
                  I’m 18 or older and connecting my own edition.
                </label>
                <button
                  className="lb-primary"
                  disabled={busy || !adult}
                  onClick={() => void run(connectEdition)}
                >
                  <Users size={16} /> Connect this edition
                </button>
              </div>
            ) : (
              <>
                <div className="lb-account-line">
                  <button
                    className="lb-text"
                    disabled={busy}
                    onClick={() => void run(refresh)}
                  >
                    <RefreshCw size={15} /> Check for new passages
                  </button>
                  <button className="lb-text" onClick={backup}>
                    Export fresh encrypted backup
                  </button>
                </div>
                {!circle ? (
                  <div className="lb-connection-columns">
                    <form
                      className="r-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => {
                          await api({ action: "create", name: familyName });
                          await refresh();
                        });
                      }}
                    >
                      <h3>Start your Family book</h3>
                      <label>
                        Family book name
                        <input
                          required
                          maxLength={60}
                          value={familyName}
                          onChange={(e) => setFamilyName(e.target.value)}
                        />
                      </label>
                      <button className="lb-primary" disabled={busy}>
                        Create family connection
                      </button>
                    </form>
                    <form
                      className="r-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => {
                          const result = await api({
                            action: "inspect",
                            code: joinCode.trim(),
                          });
                          setJoinName(result.name);
                        });
                      }}
                    >
                      <h3>Or join an invitation</h3>
                      <label>
                        Invitation code
                        <input
                          required
                          value={joinCode}
                          maxLength={40}
                          onChange={(e) => {
                            setJoinCode(e.target.value);
                            setJoinName("");
                          }}
                          autoComplete="off"
                        />
                      </label>
                      <button className="lb-secondary" disabled={busy}>
                        Review invitation
                      </button>
                      {joinName && (
                        <div className="lb-boundary">
                          <p>
                            Join <strong>{joinName}</strong>? Members will see
                            your edition name and public sharing key.
                          </p>
                          <button
                            type="button"
                            className="lb-primary"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await api({
                                  action: "join",
                                  code: joinCode.trim(),
                                });
                                setJoinName("");
                                setJoinCode("");
                                await refresh();
                              })
                            }
                          >
                            Join this family
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                ) : (
                  <>
                    <h3>{circle.name}</h3>
                    <p className="lb-fine">
                      {circle.members.length} connected editions · one
                      invitation per person
                    </p>
                    <div className="lb-member-list">
                      {circle.members.map((m) => (
                        <details key={m.uid}>
                          <summary>
                            {m.name}
                            {m.uid === user.uid ? " · you" : ""}
                            {m.uid === circle.ownerId ? " · organizer" : ""}
                          </summary>
                          <p className="lb-fine">
                            Compare this key fingerprint with {m.name} on their
                            device if you want to verify the connection.
                          </p>
                          <code>{m.keyId.match(/.{1,8}/g)?.join(" ")}</code>
                          {owner && m.uid !== user.uid && (
                            <div className="lb-actions">
                              <button
                                className="lb-text"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await api({
                                      action: "organizer",
                                      uid: m.uid,
                                    });
                                    await refresh();
                                    setInvite("");
                                  })
                                }
                              >
                                Make organizer
                              </button>
                              <button
                                className="lb-text"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await api({ action: "remove", uid: m.uid });
                                    await refresh();
                                    setInvite("");
                                  })
                                }
                              >
                                Remove from family
                              </button>
                            </div>
                          )}
                        </details>
                      ))}
                    </div>
                    {owner && (
                      <div className="lb-boundary">
                        <button
                          className="lb-secondary"
                          disabled={busy || circle.members.length >= 12}
                          onClick={() =>
                            void run(async () => {
                              const r = await api({ action: "invite" });
                              setInvite(r.code);
                            })
                          }
                        >
                          Create a one-person invitation
                        </button>
                        {invite && (
                          <>
                            <p>
                              Share this code privately. It expires in 24 hours
                              and works once. Creating another code cancels this
                              one.
                            </p>
                            <label>
                              Invitation code
                              <input
                                readOnly
                                value={invite}
                                onFocus={(e) => e.currentTarget.select()}
                              />
                            </label>
                            <button
                              className="lb-text"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  await api({ action: "cancelInvite" });
                                  setInvite("");
                                })
                              }
                            >
                              Cancel this invitation
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <details
                      className="lb-boundary"
                      open={initialPassage ? true : undefined}
                    >
                      <summary>Offer a passage from my edition</summary>
                      <p>
                        Choose the exact words and the editions that may receive
                        them. {initialPassage && book.connections?.draft
                          ? "Your earlier unfinished draft stays in your book. Send this selection before closing to keep edits to it; its original page is always kept."
                          : "Closing this window keeps your text as an encrypted local draft. Choose recipients again when you return."}
                      </p>
                      <form
                        className="r-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(send);
                        }}
                      >
                        {sources.length > 0 && (
                          <label>
                            Start from a page
                            <select
                              value=""
                              onChange={(e) => {
                                const source = sources.find(
                                  (s) => s.id === e.target.value,
                                );
                                if (source) setText(source.text);
                              }}
                            >
                              <option value="">
                                Choose a passage, or write below
                              </option>
                              {sources.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label>
                          Title
                          <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={120}
                            required
                          />
                        </label>
                        <label>
                          The exact passage
                          <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={8000}
                            rows={5}
                            required
                          />
                        </label>
                        <fieldset>
                          <legend>Offer to these editions</legend>
                          {others.map((m) => (
                            <label key={m.uid} className="lb-consent-check">
                              <input
                                type="checkbox"
                                checked={recipients.includes(m.uid)}
                                onChange={(e) =>
                                  setRecipients((prev) =>
                                    e.target.checked
                                      ? [...prev, m.uid]
                                      : prev.filter((u) => u !== m.uid),
                                  )
                                }
                              />
                              {m.name}
                            </label>
                          ))}
                        </fieldset>
                        {others.length === 0 && (
                          <p>
                            Invite another member to connect their edition
                            first.
                          </p>
                        )}
                        <button
                          className="lb-primary"
                          disabled={
                            busy ||
                            !text.trim() ||
                            !title.trim() ||
                            !recipients.length
                          }
                        >
                          <Send size={16} /> Encrypt and offer this passage
                        </button>
                      </form>
                    </details>
                    {(book.connections?.outgoing || [])
                      .filter((o) => !o.sent && o.circleId === circle.id)
                      .map((o) => (
                        <div className="lb-boundary" key={o.id}>
                          <h4>A passage is waiting to send</h4>
                          <p>{o.title}</p>
                          <p className="lb-fine">
                            Its encrypted draft is kept here. Retry uses the
                            same invitation, so it will not create a duplicate.
                          </p>
                          <button
                            className="lb-primary"
                            disabled={busy}
                            onClick={() => void run(() => sendPrepared(o))}
                          >
                            Try sending again
                          </button>
                        </div>
                      ))}
                    <h3>Passages at your door</h3>
                    <p className="lb-fine">
                      Reading one invitation and choosing whether to keep it is
                      a complete visit. The latest 60 invitations are shown
                      here; kept passages remain in your private book.
                    </p>
                    {snapshot.deliveries.filter(
                      (d) =>
                        d.sender !== user.uid &&
                        !d.revoked &&
                        d.receipts[user.uid] === "pending",
                    ).length === 0 && (
                      <p>
                        No new passages are waiting. Your own thread is a good
                        next place to begin.
                      </p>
                    )}
                    {snapshot.deliveries
                      .filter(
                        (d) =>
                          d.sender !== user.uid &&
                          !d.revoked &&
                          d.receipts[user.uid] === "pending",
                      )
                      .map((d) => (
                        <article className="lb-boundary" key={d.id}>
                          <p className="lb-kicker">From {d.senderName}</p>
                          <button
                            className="lb-primary"
                            disabled={busy}
                            onClick={() => void run(() => inspect(d))}
                          >
                            <BookOpen size={16} /> Read this invitation
                          </button>
                          <button
                            className="lb-text"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await api({
                                  action: "receipt",
                                  id: d.id,
                                  status: "declined",
                                });
                                await refresh();
                              })
                            }
                          >
                            Pass for now
                          </button>
                        </article>
                      ))}
                    {opened && (
                      <article className="lb-passage-review">
                        <p className="lb-kicker">
                          Offered by {opened.delivery.senderName}
                        </p>
                        <h3>{opened.title}</h3>
                        <blockquote>{opened.text}</blockquote>
                        <p>
                          Keep this in your private edition? It will not be
                          added to the shared game pages or sent to AI.
                        </p>
                        <button
                          className="lb-primary"
                          disabled={busy}
                          onClick={() => void run(accept)}
                        >
                          <Check size={16} /> Keep in my edition · finish here
                        </button>
                        <button
                          className="lb-text"
                          disabled={busy}
                          onClick={() => setOpened(null)}
                        >
                          Leave it for another day
                        </button>
                      </article>
                    )}
                    <details className="lb-boundary">
                      <summary>Passages I offered</summary>
                      {snapshot.deliveries
                        .filter((d) => d.sender === user.uid)
                        .map((d) => (
                          <article key={d.id}>
                            <p>
                              {book.connections?.outgoing?.find(
                                (o) => o.id === d.id,
                              )?.title || "A passage from your edition"}
                            </p>
                            <p className="lb-fine">
                              {d.revoked
                                ? "Invitation withdrawn"
                                : d.recipients
                                    .map(
                                      (u) =>
                                        `${circle.members.find((m) => m.uid === u)?.name || "Former member"}: ${d.receipts[u]}`,
                                    )
                                    .join(" · ")}
                            </p>
                            {!d.revoked && (
                              <button
                                className="lb-text"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await api({ action: "withdraw", id: d.id });
                                    await refresh();
                                  })
                                }
                              >
                                Withdraw unread invitation
                              </button>
                            )}
                          </article>
                        ))}
                    </details>
                    <details className="lb-boundary">
                      <summary>Leave this family</summary>
                      <p>
                        Future invitations will stop. People keep passages they
                        already saved. Your private book stays here.
                      </p>
                      <button
                        className="lb-secondary"
                        disabled={busy || (owner && circle.members.length > 1)}
                        onClick={() =>
                          void run(async () => {
                            await api({ action: "leave" });
                            setInvite("");
                            setOpened(null);
                            await refresh();
                          })
                        }
                      >
                        Leave family connection
                      </button>
                      {owner && circle.members.length > 1 && (
                        <p className="lb-fine">
                          Make another member the organizer first.
                        </p>
                      )}
                    </details>
                  </>
                )}
              </>
            )}
            <details className="lb-boundary">
              <summary>Delete my online account</summary>
              <p>
                This permanently removes this account, its family membership and
                its online passage records. Your local books, backups and copies
                other people have kept stay where they are. If you organize a
                family, choose another organizer first.
              </p>
              <label>
                Type DELETE ONLINE ACCOUNT to confirm
                <input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                className="lb-secondary"
                disabled={
                  busy || deleteConfirmation !== "DELETE ONLINE ACCOUNT"
                }
                onClick={() =>
                  void run(async () => {
                    if (user.emailVerified)
                      await api({
                        action: "deleteAccount",
                        confirmation: deleteConfirmation,
                      });
                    else {
                      const { deleteUser } = await import("firebase/auth");
                      await deleteUser(user);
                    }
                    await save((b) =>
                      b.connections?.identity?.uid === user.uid
                        ? {
                            ...b,
                            connections: {
                              ...b.connections,
                              identity: undefined,
                              outgoing: [],
                              received: b.connections?.received || [],
                            },
                          }
                        : b,
                    );
                    await disconnect();
                    setDeleteConfirmation("");
                    setNotice(
                      "Your online account was removed. Your private local edition and kept passages remain here.",
                    );
                  })
                }
              >
                Delete online account
              </button>
            </details>
          </>
        )}
      </section>
    </Dialog>
  );
}
