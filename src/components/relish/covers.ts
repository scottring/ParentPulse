import { emblemFor, type Emblem } from "./illustrations";

// Cloth covers for the family shelf on Family (and a child's own cover on
// their Home). Library items carry no color or emblem (book contents are
// encrypted), so a cover comes from the person: the emblem is emblemFor(name),
// the same one their book shows everywhere else, and the cloth follows the
// emblem, so a person looks the same in both places. The signed-in adult's
// own book is olive with the leaf, as inside LivingBook. Nothing is stored.

export const cloths = {
  olive: "#5e6b3c",
  rust: "#a4532f",
  blue: "#3f5f86",
  plum: "#6b4a63",
  teal: "#3e6b66",
  // Darker than a true ochre so the gold lettering keeps 3:1 contrast.
  ochre: "#86621f",
} as const;
export type Cloth = keyof typeof cloths;

const clothOf: Record<Emblem, Cloth> = {
  beetle: "rust",
  star: "blue",
  moon: "plum",
  whale: "teal",
  fox: "ochre",
  leaf: "olive",
};

export type Cover = { cloth: Cloth; color: string; emblem: Emblem };

/** A person's cover; `own` marks the signed-in adult's own book. */
export function coverFor(name: string, own = false): Cover {
  const emblem: Emblem = own ? "leaf" : emblemFor(name);
  const cloth = clothOf[emblem];
  return { cloth, color: cloths[cloth], emblem };
}

/** The words stamped on the cloth: "Kaleb’s book", "James’s book". */
export function coverTitle(label: string) {
  const name = label.trim().replace(/\s+/g, " ");
  if (!name) return "Untitled book";
  if (/\bbook$/i.test(name)) return name;
  return `${name}’s book`;
}

/** Long names step down a size so they wrap inside the cover. */
export function titleSize(title: string): "" | "long" | "longer" {
  const longestWord = Math.max(...title.split(" ").map((w) => w.length));
  if (title.length > 26 || longestWord > 14) return "longer";
  if (title.length > 16 || longestWord > 10) return "long";
  return "";
}
