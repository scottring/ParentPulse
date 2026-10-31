import type { Book } from "./model";

export const ageBands = ["under-6", "6-8", "9-12", "13-17"] as const;
export type AgeBand = (typeof ageBands)[number];
export type Audience = AgeBand | "adult";
export const ageLabels: Record<Audience, string> = {
  "under-6": "Under 6 · together with a grown-up",
  "6-8": "Ages 6–8",
  "9-12": "Ages 9–12",
  "13-17": "Ages 13–17",
  adult: "Adult · 18 or older",
};
export type ParentLock = { salt: string; verifier: string };
export type EditionProfile =
  | { kind: "adult" }
  | { kind: "child"; ageBand: AgeBand; parentLock: ParentLock };
export const isAgeBand = (x: unknown): x is AgeBand =>
  ageBands.includes(x as AgeBand);
export const isAudience = (x: unknown): x is Audience =>
  x === "adult" || isAgeBand(x);
export function isEditionProfile(x: unknown): x is EditionProfile {
  if (!x || typeof x !== "object") return false;
  const p = x as EditionProfile;
  if (p.kind === "adult") return Object.keys(p).length === 1;
  return (
    p.kind === "child" &&
    Object.keys(p).length === 3 &&
    isAgeBand(p.ageBand) &&
    !!p.parentLock &&
    typeof p.parentLock === "object" &&
    Object.keys(p.parentLock).length === 2 &&
    typeof p.parentLock.salt === "string" &&
    typeof p.parentLock.verifier === "string" &&
    /^[a-f0-9]{32}$/.test(p.parentLock.salt) &&
    /^[a-f0-9]{64}$/.test(p.parentLock.verifier)
  );
}
export const canUseOnline = (book: Pick<Book, "profile">) =>
  book.profile?.kind === "adult";
export const audienceOf = (book: Pick<Book, "profile">): Audience =>
  book.profile?.kind === "adult" ? "adult" : book.profile?.ageBand || "under-6";
export function youngestAudience(players: { audience?: Audience }[]): Audience {
  const order: Audience[] = [...ageBands, "adult"];
  return order[
    Math.min(...players.map((p) => order.indexOf(p.audience || "under-6")), 4)
  ];
}
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
async function digest(pass: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bytes = Uint8Array.from(salt.match(/../g)!, (x) => parseInt(x, 16));
  return hex(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: bytes, iterations: 600000 },
        key,
        256,
      ),
    ),
  );
}
export async function makeParentLock(pass: string): Promise<ParentLock> {
  if (pass.length < 12 || pass.length > 256)
    throw new Error(
      "Choose a parent passphrase between 12 and 256 characters.",
    );
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, verifier: await digest(pass, salt) };
}
export async function verifyParent(lock: ParentLock, pass: string) {
  if (!pass || pass.length > 256) return false;
  const result = await digest(pass, lock.salt);
  let diff = 0;
  for (let i = 0; i < result.length; i++)
    diff |= result.charCodeAt(i) ^ lock.verifier.charCodeAt(i);
  return diff === 0;
}
// Parent confirmation is a local setting, not proof of age or an OS-level parental control.
export async function configureProfile(
  book: Book,
  audience: Audience,
  parentPass: string,
): Promise<EditionProfile> {
  if (!isAudience(audience)) throw new Error("Choose an age range.");
  if (
    book.profile?.kind === "child" &&
    !(await verifyParent(book.profile.parentLock, parentPass))
  )
    throw new Error(
      "That parent passphrase did not match. The edition has not changed.",
    );
  if (audience === "adult") return { kind: "adult" };
  return {
    kind: "child",
    ageBand: audience,
    parentLock:
      book.profile?.kind === "child"
        ? book.profile.parentLock
        : await makeParentLock(parentPass),
  };
}
