"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Feather,
  Leaf,
  Lock,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
  Check,
  Download,
  Upload,
  LogOut,
  Menu,
  Sun,
  Quote,
  CornerDownRight,
  Monitor,
  Cloud,
  LoaderCircle,
} from "lucide-react";
import { type Book, type Person, type Moment } from "@/lib/relish/model";
import { useLocalBook } from "./useLocalBook";
import Image from "next/image";
import "./relish.css";
type Page = "home" | "people" | "moments";
type Modal = {
  type: "create" | "person" | "moment" | "settings" | "learn" | "edit";
  personId?: string;
  momentId?: string;
} | null;
const art: Record<string, string> = {
  anna: "/illustrations/11-couple-walking.png",
  leo: "/illustrations/02-Parent-kid-eye-level.png",
  june: "/illustrations/07-letter-in-hands.png",
};
const icons = { home: Sun, people: BookOpen, moments: Feather };
const labels: Record<Page, string> = {
  home: "The everyday",
  people: "Your people",
  moments: "Moments & learning",
};
function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className={`r-dialog ${wide ? "r-wide" : ""}`}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <button
        className="r-icon r-close"
        onClick={onClose}
        aria-label="Close dialog"
      >
        <X size={20} />
      </button>
      {children}
    </dialog>
  );
}
function Mark({ size = 26 }: { size?: number }) {
  return (
    <span className="r-mark">
      <Leaf size={size} strokeWidth={1.1} />
    </span>
  );
}
function PersonArt({
  person,
  large = false,
}: {
  person: Person;
  large?: boolean;
}) {
  return (
    <div
      className={`r-person-art r-${person.color} ${large ? "r-large-art" : ""}`}
    >
      {art[person.id] ? (
        <Image
          src={art[person.id]}
          alt=""
          width={240}
          height={240}
          sizes="(max-width: 600px) 64px, 160px"
        />
      ) : (
        <span>{person.name.slice(0, 1)}</span>
      )}
    </div>
  );
}
function VaultForm({
  locked,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  locked: boolean;
  busy: boolean;
  error: string;
  onSubmit: (pass: string, name?: string, raw?: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(""),
    [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState(""),
    [raw, setRaw] = useState(""),
    [fileError, setFileError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const restoring = !!raw;
  return (
    <form
      className="r-vault-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(pass, name, raw || undefined);
      }}
    >
      <Mark size={38} />
      <p className="r-eyebrow">YOUR WORDS. YOUR WORLD.</p>
      <h1>
        {locked
          ? "Welcome back."
          : restoring
            ? "Bring your book home."
            : "A little space, just for you."}
      </h1>
      <p>
        {locked
          ? "Unlock your book to pick up where you left off."
          : "Your relationships belong to you. Your book is encrypted and kept in this browser, on this computer."}
      </p>
      {!locked && !restoring && (
        <label>
          What should we call you?
          <input
            required
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Your first name"
          />
        </label>
      )}
      <label>
        Your passphrase
        <input
          required
          autoComplete={
            locked || restoring ? "current-password" : "new-password"
          }
          type="password"
          minLength={locked || restoring ? 1 : 12}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder={
            locked ? "Unlock your private book" : "At least 12 characters"
          }
        />
      </label>
      {!locked && !restoring && (
        <label>
          Once more, to be sure
          <input
            required
            autoComplete="new-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your passphrase"
          />
        </label>
      )}
      <p className="r-small">
        {locked
          ? "Your passphrase stays on this computer."
          : "Keep your passphrase somewhere safe. Relish cannot recover it. Export encrypted backups regularly; clearing browser data removes your local book."}
      </p>
      {(error || fileError) && (
        <p role="alert" className="r-error">
          {error || fileError}
        </p>
      )}
      <button
        className="r-primary"
        disabled={busy || (!locked && !restoring && pass !== confirm)}
      >
        {busy ? (
          <LoaderCircle className="r-spin" size={17} />
        ) : (
          <Lock size={15} />
        )}{" "}
        {busy
          ? "Opening your book…"
          : locked
            ? "Unlock my book"
            : restoring
              ? "Restore encrypted book"
              : "Create my private book"}
      </button>
      {!locked && (
        <>
          <input
            ref={input}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 12_000_000) {
                setFileError("Choose a Relish backup smaller than 12 MB.");
                return;
              }
              setRaw(await file.text());
              setFileError("");
            }}
          />
          <button
            className="r-text-button"
            type="button"
            onClick={() => input.current?.click()}
          >
            <Upload size={14} />{" "}
            {restoring
              ? "Choose a different backup"
              : "Restore an encrypted backup"}
          </button>
        </>
      )}
      {onCancel && (
        <button type="button" className="r-text-button" onClick={onCancel}>
          Keep exploring the sample book
        </button>
      )}
    </form>
  );
}
const readDate = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
const subscribeToDate = (onChange: () => void) => {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
};
export default function RelishApp() {
  const vault = useLocalBook();
  const { mode, busy, error } = vault;
  if (mode === "loading")
    return (
      <div className="r-loading">
        <span className="r-wordmark">
          relish<span>✳</span>
        </span>
        <p>Opening a little space…</p>
      </div>
    );
  if (mode === "locked")
    return (
      <div className="r-app r-locked">
        <div className="r-lock-art">
          <div className="r-wordmark">
            relish<span>✳</span>
          </div>
          <div>
            <p className="r-eyebrow">THE OPERATING MANUAL FOR RELATIONSHIPS</p>
            <h2>
              Some things
              <br />
              are yours
              <br />
              <em>to keep.</em>
            </h2>
          </div>
          <span>
            <Lock size={14} /> Encrypted. On this computer.
          </span>
        </div>
        <VaultForm locked busy={busy} error={error} onSubmit={vault.open} />
      </div>
    );
  // Locking unmounts every editor, search, and AI response along with the book.
  return <OpenBook key={mode} vault={vault} />;
}
function OpenBook({ vault }: { vault: ReturnType<typeof useLocalBook> }) {
  const { book, mode, busy, error } = vault;
  const [page, setPage] = useState<Page>("home"),
    [personId, setPersonId] = useState<string | null>(null),
    [modal, setModal] = useState<Modal>(null),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [mobileOpen, setMobileOpen] = useState(false),
    [toast, setToast] = useState("");
  const date = useSyncExternalStore(
    subscribeToDate,
    readDate,
    () => "A little attention, every day",
  );
  const sample = mode === "sample";
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, personId]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const changePage = (next: Page) => {
    setPage(next);
    setPersonId(null);
    setQuery("");
    setMobileOpen(false);
  };
  const person = book.people.find((p) => p.id === personId);
  const openMoment = (id?: string) => {
    if (!book.people.length) {
      setModal({ type: "person" });
      return;
    }
    setModal({ type: "moment", personId: id });
  };
  const save = async (next: Book, message: string) => {
    await vault.save(next);
    setToast(sample ? "Added to the sample book for this visit." : message);
  };
  const moments = book.moments.filter(
    (m) =>
      (!personId || m.personId === personId) &&
      (!query ||
        `${m.observation} ${m.move} ${m.reflection} ${book.people.find((p) => p.id === m.personId)?.name}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const waiting = book.moments.find((m) => !m.completedAt && m.move);
  return (
    <div className="r-app">
      <aside
        id="relish-navigation"
        className={`r-sidebar ${mobileOpen ? "r-mobile-open" : ""}`}
      >
        <button
          className="r-icon r-mobile-close"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
        <button
          className="r-wordmark"
          onClick={() => changePage("home")}
          aria-label="Relish home"
        >
          relish<span>✳</span>
        </button>
        <p className="r-brand-line">
          A little closer.
          <br />A little more understood.
        </p>
        <div className="r-sidebar-rule" />
        <p className="r-eyebrow">YOUR BOOK</p>
        <nav aria-label="Main navigation">
          {(["home", "people", "moments"] as Page[]).map((item) => {
            const Icon = icons[item];
            return (
              <button
                key={item}
                onClick={() => changePage(item)}
                className={page === item && !personId ? "r-active" : ""}
                aria-current={page === item && !personId ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.4} />
                {labels[item]}
                {item === "people" && <small>{book.people.length}</small>}
              </button>
            );
          })}
        </nav>
        <div className="r-sidebar-people">
          <p className="r-eyebrow">KEPT CLOSE</p>
          {book.people.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPersonId(p.id);
                setPage("people");
                setMobileOpen(false);
              }}
            >
              <span className={`r-dot r-${p.color}`} />
              {p.name}
              <ArrowUpRight size={13} />
            </button>
          ))}
          <button
            className="r-add-person"
            onClick={() => {
              setMobileOpen(false);
              setModal({ type: "person" });
            }}
          >
            <Plus size={14} /> Add someone
          </button>
        </div>
        <div className="r-sidebar-bottom">
          <div className="r-side-quote">
            “Attention is the
            <br />
            beginning of devotion.”<span>MARY OLIVER</span>
          </div>
          <button
            className="r-privacy"
            onClick={() => setModal({ type: "settings" })}
          >
            <ShieldCheck size={19} />
            <span>
              {sample ? "Your privacy, by design" : "Your private book"}
              <small>
                {sample
                  ? "Explore a sample book"
                  : "Encrypted on this computer"}
              </small>
            </span>
            <Settings2 size={15} />
          </button>
          <button
            className="r-user"
            onClick={() =>
              sample
                ? setModal({ type: "create" })
                : setModal({ type: "settings" })
            }
          >
            <span>{book.owner.slice(0, 1)}</span>
            {sample ? "Make this your own" : `${book.owner}’s book`}
            <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="r-menu-backdrop"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="r-main">
        <header className="r-topbar">
          <button
            className="r-icon r-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="relish-navigation"
          >
            <Menu size={21} />
          </button>
          <span className="r-breadcrumb">
            Your book <span>/</span> {person ? person.name : labels[page]}
          </span>
          <div className="r-top-actions">
            {searchOpen && (
              <input
                autoFocus
                aria-label="Search moments"
                placeholder="Find a moment…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage("moments");
                  setPersonId(null);
                }}
              />
            )}
            <button
              className="r-icon"
              aria-label="Search your book"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={18} />
            </button>
            <button
              className="r-status"
              onClick={() => setModal({ type: sample ? "create" : "settings" })}
            >
              <span />
              {sample ? "Sample book" : "Only on this computer"}
            </button>
            <button className="r-top-note" onClick={() => openMoment()}>
              <Plus size={15} /> A new moment
            </button>
          </div>
        </header>
        <main className="r-content">
          {page === "home" && !person && (
            <>
              <div className="r-date">
                <span>{date}</span>
                <span>
                  VOLUME 01 <span className="r-date-leaf">✳</span> A LIFE,
                  TOGETHER
                </span>
              </div>
              <section className="r-hero" aria-labelledby="hero-title">
                <div className="r-hero-copy">
                  <p className="r-eyebrow">
                    THE OPERATING MANUAL FOR RELATIONSHIPS
                  </p>
                  <h1 id="hero-title">
                    To know them.
                    <br />
                    To love them
                    <br />
                    <em>a little better.</em>
                  </h1>
                  <p>
                    A living book of the people you love.
                    <br />
                    The small things you notice. The things you learn.
                    <br />
                    The ways you find each other again.
                  </p>
                  <button className="r-primary" onClick={() => openMoment()}>
                    What’s on your mind? <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="r-hero-caption">
                  <span>A LITTLE ATTENTION GOES A LONG WAY</span>
                  <Leaf size={17} />
                </div>
              </section>
              <section className="r-section">
                <div className="r-section-title">
                  <div>
                    <p className="r-eyebrow">THE HEART OF YOUR BOOK</p>
                    <h2>Your people.</h2>
                  </div>
                  <button
                    className="r-text-button"
                    onClick={() => changePage("people")}
                  >
                    Every relationship <ArrowRight size={15} />
                  </button>
                </div>
                <div className="r-people-grid">
                  {book.people.slice(0, 3).map((p, i) => (
                    <PersonCard
                      key={p.id}
                      person={p}
                      index={i}
                      count={
                        book.moments.filter((m) => m.personId === p.id).length
                      }
                      onClick={() => {
                        setPersonId(p.id);
                        setPage("people");
                      }}
                    />
                  ))}
                  {!book.people.length && (
                    <button
                      className="r-empty-person"
                      onClick={() => setModal({ type: "person" })}
                    >
                      <Plus size={25} />
                      <h3>Who’s on your mind?</h3>
                      <p>Every living book begins with someone.</p>
                      <span>
                        Add your first person <ArrowRight size={15} />
                      </span>
                    </button>
                  )}
                </div>
              </section>
              <div className="r-below-grid">
                <section className="r-reflection-card">
                  <div className="r-card-label">
                    <span>
                      <span className="r-tiny-star">✳</span> A LITTLE ROOM TO
                      UNDERSTAND
                    </span>
                    <span>01 / PAUSE</span>
                  </div>
                  <h2>
                    Something on your mind?
                    <br />
                    <em>Let’s give it a little space.</em>
                  </h2>
                  <p>
                    A difficult conversation. A small breakthrough. Something
                    you can’t quite put into words yet.
                  </p>
                  <button
                    className="r-primary r-light-button"
                    onClick={() => openMoment()}
                  >
                    Start with what happened <ArrowUpRight size={16} />
                  </button>
                  <div className="r-card-bottom">
                    <Lock size={12} />
                    <span>Private by default. AI only when you invite it.</span>
                  </div>
                </section>
                <section className="r-followup">
                  <p className="r-eyebrow">
                    {waiting ? "A THREAD TO PICK UP" : "A SMALL INVITATION"}
                  </p>
                  <div className="r-thread">
                    <span />
                    <span />
                    <span />
                  </div>
                  <h2>
                    {waiting
                      ? "How did it go?"
                      : "What’s one thing you’d like to understand?"}
                  </h2>
                  <p>
                    {waiting
                      ? waiting.move
                      : "Choose someone. Notice a moment. Begin with curiosity."}
                  </p>
                  <button
                    className="r-text-button"
                    onClick={() =>
                      waiting
                        ? setModal({ type: "learn", momentId: waiting.id })
                        : openMoment()
                    }
                  >
                    {waiting
                      ? "Come back to this moment"
                      : "Make a little room"}{" "}
                    <ArrowRight size={15} />
                  </button>
                  {waiting && (
                    <small>
                      WITH{" "}
                      {book.people
                        .find((p) => p.id === waiting.personId)
                        ?.name.toUpperCase()}
                    </small>
                  )}
                </section>
              </div>
              <section className="r-section">
                <div className="r-section-title">
                  <div>
                    <p className="r-eyebrow">THE THINGS WORTH KEEPING</p>
                    <h2>A few pages from your life.</h2>
                  </div>
                  <button
                    className="r-text-button"
                    onClick={() => changePage("moments")}
                  >
                    Open your moments <ArrowRight size={15} />
                  </button>
                </div>
                <div className="r-moment-preview">
                  {book.moments.slice(0, 2).map((m) => (
                    <MomentCard
                      key={m.id}
                      moment={m}
                      person={book.people.find((p) => p.id === m.personId)}
                      onClick={() =>
                        setModal({ type: "learn", momentId: m.id })
                      }
                    />
                  ))}
                  {!book.moments.length && (
                    <p className="r-empty-copy">
                      Your first moment will find a home here.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
          {page === "people" && !person && (
            <>
              <div className="r-page-heading">
                <p className="r-eyebrow">
                  NO ONE COMES WITH A MANUAL. YOU CAN GROW ONE.
                </p>
                <h1>
                  The people
                  <br />
                  <em>who make your life.</em>
                </h1>
                <p>A place for what you’re learning about each other.</p>
                <button
                  className="r-primary"
                  onClick={() => setModal({ type: "person" })}
                >
                  <Plus size={16} /> Add someone to your book
                </button>
              </div>
              <div className="r-people-grid r-all-people">
                {book.people.map((p, i) => (
                  <PersonCard
                    key={p.id}
                    person={p}
                    index={i}
                    count={
                      book.moments.filter((m) => m.personId === p.id).length
                    }
                    onClick={() => setPersonId(p.id)}
                  />
                ))}
              </div>
            </>
          )}
          {person && (
            <>
              <button
                className="r-text-button r-back"
                onClick={() => setPersonId(null)}
              >
                <ArrowLeft size={15} /> All your people
              </button>
              <div className="r-person-heading">
                <div>
                  <p className="r-eyebrow">
                    A LIVING MANUAL · {person.role.toUpperCase()}
                  </p>
                  <h1>
                    {person.name}
                    <em>
                      , as you’re
                      <br />
                      coming to know them.
                    </em>
                  </h1>
                  <p>
                    {person.note ||
                      "Leave room for surprise. There is always more to know."}
                  </p>
                  <button
                    className="r-primary"
                    onClick={() => openMoment(person.id)}
                  >
                    <Feather size={16} /> Keep a moment with {person.name}
                  </button>
                </div>
                <PersonArt person={person} large />
              </div>
              <section className="r-open-book">
                <div className="r-book-page">
                  <p className="r-eyebrow">01 / WHAT I’M LEARNING</p>
                  <h2>
                    The little things
                    <br />
                    <em>that make a difference.</em>
                  </h2>
                  {person.lessons.length ? (
                    person.lessons.map((l, i) => (
                      <div className="r-lesson" key={i}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <p>{l}</p>
                      </div>
                    ))
                  ) : (
                    <p className="r-empty-copy">
                      A calmer morning. A better question. As you reflect on
                      your moments, keep what helps here.
                    </p>
                  )}
                  <button
                    className="r-text-button"
                    onClick={() =>
                      setModal({ type: "edit", personId: person.id })
                    }
                  >
                    Add or edit what you know <Plus size={15} />
                  </button>
                </div>
                <div className="r-book-page">
                  <p className="r-eyebrow">02 / ROOM FOR THEIR VOICE</p>
                  <Quote size={30} strokeWidth={1} />
                  <h2>
                    “What do you wish
                    <br />I understood
                    <br />
                    <em>about you?”</em>
                  </h2>
                  <p className="r-book-body">
                    This is your view of the relationship. Their perspective can
                    deepen it. Ask, listen, and leave room to be surprised.
                  </p>
                  <button
                    className="r-text-button"
                    onClick={() => openMoment(person.id)}
                  >
                    Keep their words <ArrowRight size={15} />
                  </button>
                  <span className="r-page-number">
                    {person.name} · always becoming
                  </span>
                </div>
              </section>
              <div className="r-section-title">
                <h2>Your story, together.</h2>
                <span className="r-small">{moments.length} moments</span>
              </div>
              <div className="r-moment-preview">
                {moments.map((m) => (
                  <MomentCard
                    key={m.id}
                    moment={m}
                    person={person}
                    onClick={() => setModal({ type: "learn", momentId: m.id })}
                  />
                ))}
              </div>
            </>
          )}
          {page === "moments" && !person && (
            <>
              <div className="r-page-heading">
                <p className="r-eyebrow">
                  ORDINARY MOMENTS. LASTING UNDERSTANDING.
                </p>
                <h1>
                  The story
                  <br />
                  <em>you’re living.</em>
                </h1>
                <p>
                  A small record of what happened, what you tried, and what
                  changed.
                </p>
              </div>
              <div className="r-filter">
                <Search size={17} />
                <input
                  aria-label="Filter moments"
                  placeholder="Find a person, a feeling, a moment…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span>{moments.length} moments</span>
              </div>
              <div className="r-moment-preview">
                {moments.map((m) => (
                  <MomentCard
                    key={m.id}
                    moment={m}
                    person={book.people.find((p) => p.id === m.personId)}
                    onClick={() => setModal({ type: "learn", momentId: m.id })}
                  />
                ))}
              </div>
              {!moments.length && (
                <div className="r-empty-state">
                  <Feather size={28} />
                  <h2>
                    {query
                      ? "No moments match that search."
                      : "Every story starts somewhere."}
                  </h2>
                  <button
                    className="r-text-button"
                    onClick={() => (query ? setQuery("") : openMoment())}
                  >
                    {query ? "Clear your search" : "Keep your first moment"}{" "}
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
          <footer className="r-footer">
            <span className="r-wordmark">
              relish<span>✳</span>
            </span>
            <span>
              {sample
                ? "Sample people and stories. Your own book starts empty."
                : "Your book is encrypted in this browser. Keep an encrypted backup."}
            </span>
            <span>MADE FOR THE HUMAN THINGS.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="r-toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {error && (
        <div className="r-error-banner" role="alert">
          {error}
        </div>
      )}
      {modal && (
        <Dialog
          title={
            modal.type === "moment"
              ? "Keep a moment"
              : modal.type === "settings"
                ? "Your privacy and your book"
                : "Your book"
          }
          onClose={() => !busy && setModal(null)}
          wide={modal.type === "moment"}
        >
          {modal.type === "create" && (
            <VaultForm
              locked={false}
              busy={busy}
              error={error}
              onCancel={() => setModal(null)}
              onSubmit={async (...args) => {
                await vault.open(...args);
              }}
            />
          )}
          {modal.type === "person" && (
            <PersonForm
              busy={busy}
              onSave={async (p) => {
                await save(
                  { ...book, people: [...book.people, p] },
                  "A new chapter in your book.",
                );
                setModal(null);
                setPersonId(p.id);
                setPage("people");
              }}
            />
          )}
          {modal.type === "edit" && (
            <EditPerson
              person={book.people.find((p) => p.id === modal.personId)!}
              busy={busy}
              onSave={async (p) => {
                await save(
                  {
                    ...book,
                    people: book.people.map((x) => (x.id === p.id ? p : x)),
                  },
                  "Your understanding, updated.",
                );
                setModal(null);
              }}
            />
          )}
          {modal.type === "moment" && (
            <MomentForm
              people={book.people}
              personId={modal.personId}
              busy={busy}
              sample={sample}
              onSave={async (m) => {
                await save(
                  { ...book, moments: [m, ...book.moments] },
                  "A moment, safely kept.",
                );
                setModal(null);
                setPage("moments");
                setPersonId(null);
              }}
            />
          )}
          {modal.type === "learn" && (
            <Reflection
              moment={book.moments.find((m) => m.id === modal.momentId)!}
              person={book.people.find(
                (p) =>
                  p.id ===
                  book.moments.find((m) => m.id === modal.momentId)?.personId,
              )!}
              busy={busy}
              onSave={async (m, lesson) => {
                await save(
                  {
                    ...book,
                    moments: book.moments.map((x) => (x.id === m.id ? m : x)),
                    people: book.people.map((p) =>
                      p.id === m.personId && lesson
                        ? { ...p, lessons: [...p.lessons, lesson] }
                        : p,
                    ),
                  },
                  "A little more understood.",
                );
                setModal(null);
              }}
            />
          )}
          {modal.type === "settings" && (
            <div className="r-settings">
              <p className="r-eyebrow">A PRIVATE PLACE TO BE HUMAN</p>
              <h2>
                Your book.
                <br />
                <em>Your boundaries.</em>
              </h2>
              <div className="r-setting-row">
                <ShieldCheck size={24} />
                <div>
                  <h3>Kept on this computer</h3>
                  <p>
                    {sample
                      ? "You’re exploring fictional stories. Create your own encrypted book to save personal information."
                      : "Your book is encrypted with your passphrase and saved in this browser profile. No account or cloud sync is used."}
                  </p>
                </div>
              </div>
              <div className="r-setting-row">
                <Sparkles size={24} />
                <div>
                  <h3>AI by invitation</h3>
                  <p>
                    During a reflection, choose an AI running on this Mac or a
                    cloud connection. Review the exact excerpt before sending
                    it. Your whole book is never attached.
                  </p>
                </div>
              </div>
              <div className="r-setting-row">
                <Lock size={24} />
                <div>
                  <h3>A lock, and a spare copy</h3>
                  <p>
                    Your book locks after 10 minutes idle, or a minute away from
                    the tab. Clearing browser data deletes the local copy. Your
                    passphrase cannot be recovered. Keep an encrypted backup.
                  </p>
                </div>
              </div>
              <div className="r-setting-row">
                <BookOpen size={24} />
                <div>
                  <h3>While your book is open</h3>
                  <p>
                    The unlocked book is readable on this device. Device
                    security and browser extensions still matter. This early
                    build has not had an independent security audit.
                  </p>
                </div>
              </div>
              {sample ? (
                <button
                  className="r-primary"
                  onClick={() => setModal({ type: "create" })}
                >
                  Create my private book <ArrowRight size={16} />
                </button>
              ) : (
                <div className="r-action-row">
                  <button
                    className="r-primary"
                    onClick={() => {
                      vault.backup();
                      setToast("Encrypted backup downloaded.");
                    }}
                  >
                    <Download size={16} /> Export encrypted backup
                  </button>
                  <button className="r-secondary" onClick={vault.lock}>
                    <LogOut size={16} /> Lock book
                  </button>
                </div>
              )}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
function PersonCard({
  person,
  index,
  count,
  onClick,
}: {
  person: Person;
  index: number;
  count: number;
  onClick: () => void;
}) {
  return (
    <button className="r-person-card" onClick={onClick}>
      <div className="r-person-card-top">
        <span>CHAPTER {String(index + 1).padStart(2, "0")}</span>
        <ArrowUpRight size={17} />
      </div>
      <div className="r-person-card-body">
        <PersonArt person={person} />
        <div>
          <h3>{person.name}</h3>
          <span>{person.role}</span>
        </div>
      </div>
      <p>{person.note || "A new chapter. A world still to discover."}</p>
      <div className="r-person-card-bottom">
        <span>
          {person.lessons.length}{" "}
          {person.lessons.length === 1 ? "thing" : "things"} you’re learning
        </span>
        <span>
          {count} {count === 1 ? "moment" : "moments"}
        </span>
      </div>
    </button>
  );
}
function MomentCard({
  moment,
  person,
  onClick,
}: {
  moment: Moment;
  person?: Person;
  onClick: () => void;
}) {
  return (
    <button className="r-moment-card" onClick={onClick}>
      <div className="r-moment-meta">
        <span>
          <span className={`r-dot r-${person?.color || "sage"}`} />
          {person?.name || "A relationship"}
        </span>
        <span>
          {moment.completedAt ? (
            <>
              <Check size={12} /> REFLECTED
            </>
          ) : (
            "A MOMENT TO RETURN TO"
          )}
        </span>
      </div>
      <h3>{moment.observation}</h3>
      <div className="r-moment-bottom">
        <span>
          {new Date(moment.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>
          {moment.completedAt ? "What you learned" : "Pick up the thread"}{" "}
          <ArrowUpRight size={14} />
        </span>
      </div>
    </button>
  );
}
function PersonForm({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (p: Person) => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [role, setRole] = useState("Partner"),
    [note, setNote] = useState(""),
    [err, setErr] = useState("");
  return (
    <form
      className="r-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave({
            id: crypto.randomUUID(),
            name: name.trim(),
            role,
            color: ["rose", "ochre", "sage"][Math.floor(Math.random() * 3)],
            note: note.trim(),
            lessons: [],
          });
        } catch {
          setErr("Could not save. Please try again.");
        }
      }}
    >
      <p className="r-eyebrow">A NEW CHAPTER</p>
      <h2>
        Who makes
        <br />
        <em>your life, yours?</em>
      </h2>
      <label>
        Their name
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Someone you love"
        />
      </label>
      <label>
        Your relationship
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {[
            "Partner",
            "Child",
            "Parent",
            "Sibling",
            "Friend",
            "Colleague",
            "Someone important",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        A little about them <span>optional</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="What makes them, them?"
          rows={3}
        />
      </label>
      {err && (
        <p className="r-error" role="alert">
          {err}
        </p>
      )}
      <button className="r-primary" disabled={busy || !name.trim()}>
        Open their chapter <ArrowRight size={16} />
      </button>
    </form>
  );
}
function EditPerson({
  person,
  busy,
  onSave,
}: {
  person: Person;
  busy: boolean;
  onSave: (p: Person) => Promise<void>;
}) {
  const [note, setNote] = useState(person.note),
    [lessons, setLessons] = useState(person.lessons.join("\n")),
    [err, setErr] = useState("");
  return (
    <form
      className="r-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave({
            ...person,
            note,
            lessons: lessons
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
          });
        } catch {
          setErr("Could not save. Please try again.");
        }
      }}
    >
      <p className="r-eyebrow">YOUR UNDERSTANDING CAN CHANGE</p>
      <h2>
        What you know
        <br />
        <em>about {person.name}.</em>
      </h2>
      <label>
        Their chapter introduction
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </label>
      <label>
        What you’re learning <span>One thought per line</span>
        <textarea
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          rows={7}
          maxLength={10000}
        />
      </label>
      {err && (
        <p role="alert" className="r-error">
          {err}
        </p>
      )}
      <button className="r-primary" disabled={busy}>
        Keep these thoughts <Check size={16} />
      </button>
    </form>
  );
}
function MomentForm({
  people,
  personId,
  busy,
  sample,
  onSave,
}: {
  people: Person[];
  personId?: string;
  busy: boolean;
  sample: boolean;
  onSave: (m: Moment) => Promise<void>;
}) {
  const [step, setStep] = useState(0),
    [who, setWho] = useState(personId || people[0]?.id || ""),
    [observation, setObservation] = useState(""),
    [perspective, setPerspective] = useState(""),
    [move, setMove] = useState(""),
    [err, setErr] = useState(""),
    [ai, setAi] = useState(false);
  const person = people.find((p) => p.id === who);
  const title = [
    "Start with a moment.",
    "Make room for another view.",
    "One small move.",
  ][step];
  return (
    <div className="r-moment-form">
      <p className="r-eyebrow">A LITTLE ROOM TO UNDERSTAND</p>
      <div className="r-stepper">
        {["Notice", "Understand", "Try"].map((s, i) => (
          <span key={s} className={step >= i ? "r-step-active" : ""}>
            <b>{i < step ? <Check size={12} /> : i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      <h2>{title}</h2>
      <p className="r-form-intro">
        {
          [
            "A small joy, a difficult exchange, or something still on your mind. Write it as it happened.",
            "You know what happened. What might you not yet know? Hold your interpretation lightly.",
            "What could you say, ask, or try? Make it small enough to do, and kind enough to mean.",
          ][step]
        }
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (step < 2) {
            setStep(step + 1);
            return;
          }
          try {
            await onSave({
              id: crypto.randomUUID(),
              personId: who,
              observation: observation.trim(),
              perspective: perspective.trim(),
              move: move.trim(),
              reflection: "",
              createdAt: new Date().toISOString(),
            });
          } catch {
            setErr("Could not save this moment. Your writing is still here.");
          }
        }}
      >
        {step === 0 && (
          <>
            <label>
              Who’s this moment with?
              <select value={who} onChange={(e) => setWho(e.target.value)}>
                {people.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              What happened?
              <textarea
                autoFocus
                required
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={6}
                maxLength={8000}
                placeholder="Start anywhere. There’s no right way to write this."
              />
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <blockquote className="r-context-quote">{observation}</blockquote>
            <label>
              Another possible perspective
              <textarea
                autoFocus
                value={perspective}
                onChange={(e) => setPerspective(e.target.value)}
                rows={4}
                maxLength={8000}
                placeholder={`What might ${person?.name} have needed? What could you ask instead of assuming?`}
              />
            </label>
            <button
              type="button"
              className="r-ai-invite"
              onClick={() => setAi(!ai)}
            >
              <Sparkles size={17} />
              {ai ? "Close AI invitation" : "Invite a little help from AI"}
              <span>Your choice, every time</span>
            </button>
            {ai && (
              <AIHelp
                observation={observation}
                onUse={(text) => {
                  setPerspective(text);
                  setAi(false);
                }}
              />
            )}
          </>
        )}
        {step === 2 && (
          <>
            <div className="r-prompt-note">
              <Leaf size={20} />
              <p>
                A good next move might be a question, a little more time, or
                simply listening differently.
              </p>
            </div>
            <label>
              What would you like to try?
              <textarea
                autoFocus
                value={move}
                onChange={(e) => setMove(e.target.value)}
                rows={5}
                maxLength={3000}
                placeholder="Next time, I’d like to…"
              />
            </label>
            <p className="r-small">
              You can also keep this moment without a next step.
            </p>
          </>
        )}
        {err && (
          <p role="alert" className="r-error">
            {err}
          </p>
        )}
        <div className="r-form-actions">
          {step > 0 ? (
            <button
              type="button"
              className="r-text-button"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={15} /> Back
            </button>
          ) : (
            <span className="r-small">
              <Lock size={12} />{" "}
              {sample
                ? "Sample book · this visit only"
                : "Private, in your encrypted book"}
            </span>
          )}
          <button
            className="r-primary"
            disabled={busy || !who || (step === 0 && !observation.trim())}
          >
            {busy
              ? "Keeping your moment…"
              : step === 2
                ? "Keep this moment"
                : "Continue"}{" "}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
function AIHelp({
  observation,
  onUse,
}: {
  observation: string;
  onUse: (text: string) => void;
}) {
  const [provider, setProvider] = useState<"local" | "cloud">("local"),
    [excerpt, setExcerpt] = useState(observation),
    [model, setModel] = useState(""),
    [answer, setAnswer] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function ask() {
    setBusy(true);
    setError("");
    setAnswer("");
    controller.current = new AbortController();
    try {
      const res = await fetch("/api/relish/assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-relish-consent": "selected-excerpt",
        },
        body: JSON.stringify({ provider, model, excerpt }),
        signal: controller.current.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnswer(data.text);
    } catch (e) {
      if (!controller.current?.signal.aborted)
        setError(
          e instanceof Error ? e.message : "The connection is unavailable.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="r-ai-panel">
      <h3>A second perspective, on your terms.</h3>
      <div className="r-provider-choice">
        <button
          type="button"
          className={provider === "local" ? "r-selected" : ""}
          onClick={() => {
            setProvider("local");
            setAnswer("");
          }}
        >
          <Monitor size={15} /> On this Mac
        </button>
        <button
          type="button"
          className={provider === "cloud" ? "r-selected" : ""}
          onClick={() => {
            setProvider("cloud");
            setAnswer("");
          }}
        >
          <Cloud size={15} /> Cloud AI
        </button>
      </div>
      <p className="r-small">
        {provider === "local"
          ? "Uses an installed model through Ollama when Relish runs locally. This excerpt stays on this computer."
          : "Sends the excerpt below to OpenAI through your configured connection. Its data policies apply. Your full book stays on this computer."}
      </p>
      {provider === "local" && (
        <label>
          Installed model name
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="For example, the model listed in Ollama"
          />
        </label>
      )}
      <label>
        Only this excerpt will be sent
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
          maxLength={10000}
        />
      </label>
      <button
        type="button"
        className="r-secondary"
        disabled={
          busy ||
          excerpt.trim().length < 5 ||
          (provider === "local" && !model.trim())
        }
        onClick={ask}
      >
        {busy ? (
          <LoaderCircle size={15} className="r-spin" />
        ) : (
          <Sparkles size={15} />
        )}{" "}
        {busy
          ? "Considering your moment…"
          : provider === "local"
            ? "Send excerpt to local model"
            : "Send this excerpt to OpenAI"}
      </button>
      {error && (
        <p className="r-error" role="alert">
          {error}
        </p>
      )}
      {answer && (
        <div className="r-ai-answer">
          <p className="r-eyebrow">A POSSIBILITY, NOT A VERDICT</p>
          <p>{answer}</p>
          <button
            type="button"
            className="r-text-button"
            onClick={() => onUse(answer)}
          >
            Use this as a starting point <CornerDownRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function Reflection({
  moment,
  person,
  busy,
  onSave,
}: {
  moment: Moment;
  person: Person;
  busy: boolean;
  onSave: (m: Moment, lesson: string) => Promise<void>;
}) {
  const [reflection, setReflection] = useState(moment.reflection),
    [lesson, setLesson] = useState(""),
    [err, setErr] = useState("");
  return (
    <form
      className="r-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave(
            {
              ...moment,
              reflection: reflection.trim(),
              completedAt: new Date().toISOString(),
            },
            lesson.trim(),
          );
        } catch {
          setErr("Could not save. Please try again.");
        }
      }}
    >
      <p className="r-eyebrow">
        WITH {person?.name.toUpperCase()} · A THREAD TO PICK UP
      </p>
      <h2>
        What happened
        <br />
        <em>after that?</em>
      </h2>
      <blockquote className="r-context-quote">{moment.observation}</blockquote>
      {moment.perspective && (
        <p className="r-small">Your perspective: {moment.perspective}</p>
      )}
      {moment.move && (
        <div className="r-prompt-note">
          <Leaf size={20} />
          <p>{moment.move}</p>
        </div>
      )}
      <label>
        What did you notice?
        <textarea
          required
          autoFocus
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          maxLength={8000}
          placeholder="What changed? What didn’t? What surprised you?"
        />
      </label>
      <label>
        One thing to keep in {person?.name}’s manual <span>optional</span>
        <textarea
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="I’m learning that…"
        />
      </label>
      {err && (
        <p role="alert" className="r-error">
          {err}
        </p>
      )}
      <button className="r-primary" disabled={busy || !reflection.trim()}>
        Keep what I’m learning <Check size={16} />
      </button>
    </form>
  );
}
