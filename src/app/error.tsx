"use client";
import { useEffect } from "react";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    window.dispatchEvent(new Event("relish:locked"));
  }, []);
  return (
    <main style={{ maxWidth: 600, margin: "12vh auto", padding: 24 }}>
      <h1>Let’s find your place again.</h1>
      <p>
        Something interrupted this page. Your last saved, encrypted copy remains
        in this browser. A change that had not finished saving may need to be
        entered again.
      </p>
      <button
        onClick={reset}
        style={{ padding: 16, border: "1px solid", borderRadius: 6 }}
      >
        Reopen Relish
      </button>
    </main>
  );
}
