import { expect, it } from "vitest";
import { cloths, coverFor, coverTitle, titleSize } from "../covers";
import { emblemFor } from "../illustrations";

it("gives the adult's own book the olive cloth and the leaf", () => {
  expect(coverFor("Scott", true)).toEqual({
    cloth: "olive",
    color: cloths.olive,
    emblem: "leaf",
  });
});

it("uses each person's existing emblem, with a cloth that follows it", () => {
  expect(coverFor("Kaleb").emblem).toBe("beetle");
  expect(coverFor("Kaleb").cloth).toBe("rust");
  expect(coverFor("Ella").emblem).toBe("star");
  expect(coverFor("Ella").cloth).toBe("blue");
  for (const name of ["Robin", "Wren", "Mia", "Lou", "Zed", "Quinn"])
    expect(coverFor(name).emblem).toBe(emblemFor(name));
  // Same person, same cover, wherever it is drawn.
  expect(coverFor(" kaleb ")).toEqual(coverFor("Kaleb"));
});

it("stamps the name as the person's book", () => {
  expect(coverTitle("Kaleb")).toBe("Kaleb’s book");
  expect(coverTitle("  James ")).toBe("James’s book");
  expect(coverTitle("")).toBe("Untitled book");
  expect(coverTitle("Family book")).toBe("Family book");
  expect(titleSize(coverTitle("Ella"))).toBe("");
  expect(titleSize(coverTitle("Maximilian Alexander"))).toBe("longer");
  expect(titleSize(coverTitle("Bartholomew"))).toBe("long");
});
