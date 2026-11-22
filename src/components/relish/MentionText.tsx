"use client";
import { mentionSegments } from "@/lib/relish/mentions";
import "./journal-stream.css";

/** Words with each "@Name" drawn in the light green mention style. */
export default function MentionText({ text }: { text: string }) {
  return (
    <>
      {mentionSegments(text).map((s, i) =>
        s.mention ? (
          <span key={i} className="rj-mention">
            {s.text}
          </span>
        ) : (
          s.text
        ),
      )}
    </>
  );
}
