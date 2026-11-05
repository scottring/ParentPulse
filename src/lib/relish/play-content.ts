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

// "Same page?" — everyone answers the same question in private, then the reveal
// shows where the group agrees. Every prompt has exactly three choices.
const sameYoung: Round[] = [
  { prompt: "Our best Saturday breakfast is…", choices: ["pancakes", "cereal in our pajamas", "eggs and toast"] },
  { prompt: "The best movie-night snack is…", choices: ["popcorn", "fruit", "something sweet"] },
  { prompt: "Our perfect rainy day is…", choices: ["a blanket fort", "a board game", "baking something"] },
  { prompt: "The best way to cheer someone up is…", choices: ["a hug", "a silly joke", "some quiet time"] },
];
const sameOlder: Round[] = [
  { prompt: "Our ideal family trip is…", choices: ["mountains or woods", "a big city", "a beach"] },
  { prompt: "The fairest way to pick the movie is…", choices: ["take turns", "everyone votes", "flip a coin"] },
  { prompt: "The house rule that matters most is…", choices: ["be kind", "tell the truth", "clean up after yourself"] },
  { prompt: "When someone in our family is upset, the best first move is…", choices: ["give them some space", "ask what they need", "offer a hug or a snack"] },
  { prompt: "A perfect family evening is…", choices: ["cooking together", "a game night", "everyone cozy with their own thing"] },
];
const sameAdult: Round[] = [
  { prompt: "Bedtime is running 30 minutes late. What do we do?", choices: ["Lights out now, no extras", "Shorter routine, keep the cuddle", "Let it go tonight, reset tomorrow"] },
  { prompt: "A child says, “I’m bored.” The best answer is…", choices: ["Boredom is fine; you’ll find something", "Offer two ideas to choose from", "Let’s do something together"] },
  { prompt: "Screens at the dinner table?", choices: ["Never", "Only something we watch together", "Fine on special nights"] },
  { prompt: "A free Saturday afternoon appears. We…", choices: ["get out of the house together", "each do our own thing", "tackle a project as a team"] },
  { prompt: "A child asks for a new toy they’ve wanted for weeks.", choices: ["They save up for it", "It waits for a birthday or holiday", "Yes, if it’s small"] },
  { prompt: "Someone says something unkind at the table. First move?", choices: ["Name it calmly, right then", "Talk to them afterwards, privately", "Let it go unless it happens again"] },
];
export function samePagePrompts(audience: Audience): Round[] {
  if (audience === "adult") return sameAdult;
  return audience === "under-6" || audience === "6-8" ? sameYoung : sameOlder;
}
