"use client";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  Cloud,
  Monitor,
  Sparkles,
  LoaderCircle,
  CornerDownRight,
  ShieldCheck,
} from "lucide-react";
type Connection = {
  local: boolean;
  cloud: boolean;
  hosted: boolean;
  dailyLimit: number;
};
export function AIHelp({
  observation,
  onUse,
}: {
  observation: string;
  onUse: (text: string) => void;
}) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [provider, setProvider] = useState<"local" | "cloud">("cloud");
  const [excerpt, setExcerpt] = useState(observation);
  const [model, setModel] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const load = new AbortController();
    fetch("/api/relish/assist/", { signal: load.signal })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Connection) => {
        setConnection(data);
        setProvider(data.local ? "local" : "cloud");
      })
      .catch(() => {
        if (!load.signal.aborted)
          setError(
            "The AI connection could not be checked. Close this invitation and try again.",
          );
      });
    import("@/lib/relish/ai-auth").then(({ currentAIUser }) => {
      if (mounted.current) setUser(currentAIUser());
    });
    return () => {
      mounted.current = false;
      load.abort();
      controller.current?.abort();
    };
  }, []);
  async function connect() {
    setAccountBusy(true);
    setError("");
    setAccountNotice("");
    try {
      const { connectAI } = await import("@/lib/relish/ai-auth");
      const next = await connectAI(email, password, create);
      if (mounted.current) {
        setUser(next);
        setPassword("");
        setShowAccount(false);
        if (!next.emailVerified)
          setAccountNotice(
            "Check your inbox for the verification link, then return here.",
          );
      }
    } catch {
      if (mounted.current)
        setError(
          create
            ? "That account could not be created. Try a different email or sign in if you already have an account."
            : "That sign-in didn’t work. Check your email and password, then try again.",
        );
    } finally {
      if (mounted.current) setAccountBusy(false);
    }
  }
  async function checkVerification() {
    if (!user) return;
    setAccountBusy(true);
    setError("");
    try {
      await user.reload();
      await user.getIdToken(true);
      if (user.emailVerified) {
        setAccountNotice("Email verified. You’re ready.");
        setUser(user);
      } else
        setAccountNotice(
          "Your email isn’t verified yet. Open the link in your inbox first.",
        );
    } catch {
      setError("Your account could not be checked. Please sign in again.");
    } finally {
      setAccountBusy(false);
    }
  }
  async function resend() {
    if (!user) return;
    setAccountBusy(true);
    setError("");
    try {
      const { sendEmailVerification } = await import("firebase/auth");
      await sendEmailVerification(user);
      setAccountNotice("A verification link is on its way to your inbox.");
    } catch {
      setError("The link couldn’t be sent. Wait a moment and try again.");
    } finally {
      setAccountBusy(false);
    }
  }
  async function disconnect() {
    const { disconnectAI } = await import("@/lib/relish/ai-auth");
    await disconnectAI();
    setUser(null);
    setAnswer("");
    setAccountNotice("");
  }
  async function ask() {
    setBusy(true);
    setError("");
    setAnswer("");
    const pending = new AbortController();
    controller.current = pending;
    try {
      const token = connection?.hosted ? await user?.getIdToken() : undefined;
      if (pending.signal.aborted) return;
      const res = await fetch("/api/relish/assist/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-relish-consent": "selected-excerpt",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ provider, model, excerpt }),
        signal: pending.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) await disconnect();
        throw new Error(
          data.error || "The connection is unavailable. Please try again.",
        );
      }
      if (!pending.signal.aborted) setAnswer(data.text);
    } catch (e) {
      if (!pending.signal.aborted)
        setError(
          e instanceof Error ? e.message : "The connection is unavailable.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const needsAccount = provider === "cloud" && connection?.hosted;
  const available =
    provider === "cloud" ? connection?.cloud : connection?.local;
  return (
    <div className="r-ai-panel">
      <h3>A second perspective, on your terms.</h3>
      {!connection ? (
        <p className="r-small" role="status">
          Checking the connection…
        </p>
      ) : (
        <>
          {connection.local ? (
            <div className="r-provider-choice">
              <button
                type="button"
                disabled={busy}
                className={provider === "local" ? "r-selected" : ""}
                onClick={() => {
                  setProvider("local");
                  setAnswer("");
                  setError("");
                }}
              >
                <Monitor size={15} /> On this computer
              </button>
              <button
                type="button"
                disabled={busy}
                className={provider === "cloud" ? "r-selected" : ""}
                onClick={() => {
                  setProvider("cloud");
                  setAnswer("");
                  setError("");
                }}
              >
                <Cloud size={15} /> Cloud AI
              </button>
            </div>
          ) : (
            <p className="r-ai-connection">
              <Cloud size={16} /> A little help from OpenAI
            </p>
          )}
          <p className="r-small">
            {provider === "local" ? (
              "Uses an installed model through Ollama while Relish runs locally. This excerpt stays on this computer."
            ) : (
              <>
                Only the excerpt below passes through Relish’s server to OpenAI.
                Your full book and passphrase stay here. OpenAI’s{" "}
                <a
                  href="https://platform.openai.com/docs/guides/your-data"
                  target="_blank"
                  rel="noreferrer"
                >
                  data policies
                </a>{" "}
                apply; abuse-monitoring retention may apply even though response
                storage is disabled.
              </>
            )}
          </p>
          {!available && (
            <p className="r-small">
              This connection is not available yet. You can keep reflecting
              without AI.
            </p>
          )}
          {needsAccount && available && (
            <div className="r-ai-account">
              <p className="r-ai-connection">
                <ShieldCheck size={16} /> An account for AI. A private book for
                you.
              </p>
              <p className="r-small">
                Sign-in enables up to {connection.dailyLimit} AI reflections a
                day. It doesn’t upload or unlock your book. We keep usage
                counts; your AI session ends when the page reloads or your book
                locks.
              </p>
              {user ? (
                <>
                  <p className="r-small">Connected as {user.email}</p>
                  {!user.emailVerified && (
                    <div className="r-ai-account-actions">
                      <button
                        type="button"
                        className="r-secondary"
                        disabled={accountBusy}
                        onClick={checkVerification}
                      >
                        I’ve verified my email
                      </button>
                      <button
                        type="button"
                        className="r-text-button"
                        disabled={accountBusy}
                        onClick={resend}
                      >
                        Send verification link
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="r-text-button"
                    disabled={busy || accountBusy}
                    onClick={disconnect}
                  >
                    Disconnect AI account
                  </button>
                </>
              ) : showAccount ? (
                <>
                  <label>
                    Email address
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={254}
                    />
                  </label>
                  <label>
                    AI account password
                    <input
                      type="password"
                      autoComplete={
                        create ? "new-password" : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={create ? 12 : 1}
                      maxLength={128}
                    />
                  </label>
                  <p className="r-small">
                    Use a different password from your book’s passphrase.
                  </p>
                  <div className="r-ai-account-actions">
                    <button
                      type="button"
                      className="r-secondary"
                      disabled={
                        accountBusy ||
                        !email.includes("@") ||
                        password.length < (create ? 12 : 1)
                      }
                      onClick={connect}
                    >
                      {accountBusy
                        ? "Connecting…"
                        : create
                          ? "Create AI account"
                          : "Sign in"}
                    </button>
                    <button
                      type="button"
                      className="r-text-button"
                      disabled={accountBusy}
                      onClick={() => {
                        setCreate(!create);
                        setError("");
                      }}
                    >
                      {create
                        ? "I already have an account"
                        : "Create an account"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="r-secondary"
                  onClick={() => setShowAccount(true)}
                >
                  Sign in for AI
                </button>
              )}
              {accountNotice && (
                <p className="r-small" role="status">
                  {accountNotice}
                </p>
              )}
            </div>
          )}
          {provider === "local" && (
            <label>
              Installed model name
              <input
                value={model}
                disabled={busy}
                onChange={(e) => setModel(e.target.value)}
                placeholder="The model name listed in Ollama"
              />
            </label>
          )}
          <label>
            Only this excerpt will be sent
            <textarea
              value={excerpt}
              disabled={busy}
              onChange={(e) => {
                setExcerpt(e.target.value);
                setAnswer("");
              }}
              rows={3}
              maxLength={10000}
            />
          </label>
          <button
            type="button"
            className="r-secondary"
            disabled={
              busy ||
              accountBusy ||
              !available ||
              excerpt.trim().length < 5 ||
              (provider === "local" && !model.trim()) ||
              Boolean(needsAccount && !user?.emailVerified)
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
        </>
      )}
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
