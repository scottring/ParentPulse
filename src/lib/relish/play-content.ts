import type { Audience } from "./profiles";
type Round = { prompt: string; choices: string[] };
const content: Record<
  Exclude<Audience, "adult">,
  { joys: string[]; rounds: Round[] }
> = {
  "under-6": {
    joys: [
      "A silly song",
      "Building a tower",
      "A story together",
      "A quiet little rest",
    ],
    rounds: [
      {
        prompt: "In the garden, we found…",
        choices: ["a tiny blue door", "a fluffy cloud", "a shiny pebble"],
      },
      {
        prompt: "Our new friend was…",
        choices: ["a little rabbit", "a sleepy bear", "a dancing duck"],
      },
      {
        prompt: "We took…",
        choices: ["a soft blanket", "a little snack", "a red ball"],
      },
      {
        prompt: "When we needed help, we…",
        choices: [
          "asked a kind grown-up",
          "took a little rest",
          "tried together",
        ],
      },
      {
        prompt: "At the end, we…",
        choices: ["sang a song", "waved goodbye", "sat down for a story"],
      },
    ],
  },
  "6-8": {
    joys: [
      "Playing outside",
      "Making something",
      "Reading together",
      "A silly guessing game",
    ],
    rounds: [
      {
        prompt: "On our walk, we found…",
        choices: [
          "a secret tree house",
          "a map with a funny drawing",
          "a cloud shaped like a cat",
        ],
      },
      {
        prompt: "A friend joined us. It was…",
        choices: [
          "a fox in yellow boots",
          "a dragon who loved stories",
          "a snail carrying a picnic",
        ],
      },
      {
        prompt: "We packed…",
        choices: [
          "a torch and a snack",
          "a tiny umbrella",
          "a notebook for our ideas",
        ],
      },
      {
        prompt: "When we got stuck, we…",
        choices: [
          "asked someone kind for help",
          "took turns trying ideas",
          "stopped for a snack",
        ],
      },
      {
        prompt: "Together, we decided to…",
        choices: [
          "build a den",
          "make up a new game",
          "have a picnic with our friend",
        ],
      },
    ],
  },
  "9-12": {
    joys: [
      "Exploring somewhere new",
      "Making or building something",
      "Time with a good friend",
      "A little time to myself",
    ],
    rounds: [
      {
        prompt: "Our adventure began with…",
        choices: [
          "a map that changed each morning",
          "a library on wheels",
          "a mysterious invitation",
        ],
      },
      {
        prompt: "Someone joined our team. They brought…",
        choices: [
          "a talent for asking good questions",
          "a collection of unlikely inventions",
          "a different way of seeing the map",
        ],
      },
      {
        prompt: "We chose to explore…",
        choices: [
          "a garden above the clouds",
          "a tunnel of echoes",
          "a city powered by stories",
        ],
      },
      {
        prompt: "When our ideas clashed, we…",
        choices: [
          "made room for each person’s idea",
          "paused and asked for help",
          "tried a small experiment together",
        ],
      },
      {
        prompt: "By the end, we had…",
        choices: [
          "made something none of us could make alone",
          "found a place to begin again",
          "a story we could each tell differently",
        ],
      },
    ],
  },
  "13-17": {
    joys: [
      "Time for something I’m into",
      "Making something with friends",
      "An unhurried conversation",
      "Space to recharge on my own",
    ],
    rounds: [
      {
        prompt: "It started when we discovered…",
        choices: [
          "a message from our future selves",
          "a city where nobody knew our names",
          "a radio that played unheard stories",
        ],
      },
      {
        prompt: "An unexpected collaborator offered…",
        choices: [
          "a skill none of us had",
          "a question that changed our plan",
          "a different idea of what success could mean",
        ],
      },
      {
        prompt: "We chose to spend our time on…",
        choices: [
          "a project with no instructions",
          "a journey with room for detours",
          "making a place where we could be ourselves",
        ],
      },
      {
        prompt: "When the plan stopped working, we…",
        choices: [
          "said what each of us needed",
          "asked for another perspective",
          "made room to change our minds",
        ],
      },
      {
        prompt: "What we took home was…",
        choices: [
          "an idea worth trying in real life",
          "respect for our different ways of seeing",
          "permission to leave the next chapter open",
        ],
      },
    ],
  },
};
export function childPlayContent(audience: Exclude<Audience, "adult">) {
  return content[audience];
}
export function childStoryRounds(
  count: number,
  audience: Exclude<Audience, "adult">,
): Round[] {
  const [opening, friend, ...rest] = content[audience].rounds;
  const ending = rest.at(-1)!;
  const middle = rest.slice(0, -1);
  return [
    opening,
    friend,
    ...Array.from(
      { length: Math.max(0, count - 3) },
      (_, i) => middle[i % middle.length],
    ),
    ending,
  ];
}
