import { describe, expect, it } from "vitest";
import {
  insertMention,
  mentionAt,
  mentionChoices,
  mentionSegments,
  mentionTokens,
  resolveMentions,
} from "../mentions";

describe("@-mentions", () => {
  it("reads @Name at the start or after a space or punctuation, never inside an email", () => {
    expect(mentionTokens("@Leo wore his boots. (@Anna laughed.) Mail alex@example.invalid")).toEqual([
      "Leo",
      "Anna",
    ]);
    expect(mentionTokens("@Dad’s pancakes, @dad again")).toEqual(["Dad"]);
    expect(mentionTokens("no mentions @ all")).toEqual([]);
  });

  it("cuts text into plain runs and mentions without losing a character", () => {
    const text = "Then @Leo said, “@Anna, look!”";
    const parts = mentionSegments(text);
    expect(parts.map((p) => p.text).join("")).toBe(text);
    expect(parts.filter((p) => p.mention).map((p) => p.text)).toEqual(["@Leo", "@Anna"]);
  });

  it("resolves mentions to known names by whole or first name, once each", () => {
    const names = ["Leo", "Anna Rivera", "Grandma June"];
    expect(resolveMentions("@Anna and @leo and @Leo", names)).toEqual(["Anna Rivera", "Leo"]);
    expect(resolveMentions("@GrandmaJune came", names)).toEqual(["Grandma June"]);
    expect(resolveMentions("@Dad made pancakes", names)).toEqual([]);
  });

  it("finds the @ being typed and replaces it with @Name", () => {
    const text = "At the pool @Le";
    const at = mentionAt(text, text.length)!;
    expect(at).toEqual({ start: 12, query: "Le" });
    expect(mentionAt("email a@b", 9)).toBeNull();
    expect(mentionAt("done @Leo now", 13)).toBeNull();
    const done = insertMention(text, at, "Leo");
    expect(done.text).toBe("At the pool @Leo ");
    expect(done.caret).toBe(done.text.length);
    // Mid-sentence, the following space is reused.
    const mid = insertMention("Hi @A there", { start: 3, query: "A" }, "Anna");
    expect(mid.text).toBe("Hi @Anna there");
  });

  it("offers people whose name starts with what's typed", () => {
    const people = [{ name: "Anna" }, { name: "Leo" }, { name: "Grandma June" }];
    expect(mentionChoices(people, "").map((p) => p.name)).toEqual(["Anna", "Leo", "Grandma June"]);
    expect(mentionChoices(people, "j").map((p) => p.name)).toEqual(["Grandma June"]);
    expect(mentionChoices(people, "le").map((p) => p.name)).toEqual(["Leo"]);
  });
});
