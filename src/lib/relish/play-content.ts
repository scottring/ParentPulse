import type { Audience } from "./profiles";
import type { Tag } from "./catalog";
type Round = { prompt: string; choices: string[] };
// Small joys: the first four of each list are what one-chooser rounds offer;
// rounds where everyone is guessed about offer the first ten. Never reorder
// them: open rounds store picks by position.
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
      "Splashing in the bath",
      "Playing chase",
      "Baking something yummy",
      "Dancing to music",
      "Drawing a picture",
      "A cuddle on the couch",
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
      "A trip to the park",
      "Building with blocks",
      "Baking or cooking",
      "A movie with snacks",
      "Drawing or painting",
      "A bike or scooter ride",
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
      "A game night",
      "Cooking something new",
      "Running around outside",
      "A good book or comic",
      "Music turned up loud",
      "A trip out for a treat",
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
      "Music and headphones",
      "Food out with someone",
      "Sleeping in",
      "A show to watch together",
      "Getting outside",
      "Being trusted with something",
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
/** Grown-up small joys after the first four (which live with the older rounds). */
export const adultJoysMore = [
  "Coffee or tea in peace",
  "A meal someone else cooked",
  "An early night",
  "Music while cooking",
  "Time outside",
  "A long talk with a friend",
];
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

// "Same page?" — everyone answers the same questions in private, then the
// reveal shows where the group agrees. Every question has exactly three
// choices. Ids and choice order are stored in play records and open rounds:
// never reorder, reword the meaning of, or remove a question; add new ones.
export type SameQuestion = {
  id: string;
  /** A few words for "you differ most on …". */
  topic: string;
  prompt: string;
  choices: string[];
};
// The first entries of each list are the one-question rounds from before
// rounds had five questions; older open rounds still pick from these by index.
const sameYoung: SameQuestion[] = [
  { id: "y-breakfast", topic: "breakfast", prompt: "Our best Saturday breakfast is…", choices: ["pancakes", "cereal in our pajamas", "eggs and toast"] },
  { id: "y-snack", topic: "movie snacks", prompt: "The best movie-night snack is…", choices: ["popcorn", "fruit", "something sweet"] },
  { id: "y-rainy", topic: "rainy days", prompt: "Our perfect rainy day is…", choices: ["a blanket fort", "a board game", "baking something"] },
  { id: "y-cheer", topic: "cheering someone up", prompt: "The best way to cheer someone up is…", choices: ["a hug", "a silly joke", "some quiet time"] },
];
const sameYoungMore: SameQuestion[] = [
  { id: "y-movie-pick", topic: "picking the movie", prompt: "Who should pick the movie tonight?", choices: ["the youngest", "we take turns", "everyone votes"] },
  { id: "y-bedtime", topic: "bedtime", prompt: "The best part of bedtime is…", choices: ["a story", "a song", "a cuddle and a chat"] },
  { id: "y-park", topic: "trips to the park", prompt: "The best thing at the park is…", choices: ["the swings", "a picnic", "running races"] },
  { id: "y-pet", topic: "pets", prompt: "If we got a pet, it should be…", choices: ["a dog", "a cat", "a fish"] },
  { id: "y-sad", topic: "sad moments", prompt: "When I feel sad, I like it when someone…", choices: ["gives me a hug", "makes me laugh", "sits with me quietly"] },
  { id: "y-weekend", topic: "weekend mornings", prompt: "On a weekend morning, we should…", choices: ["stay in our pajamas", "go somewhere fun", "make something together"] },
  { id: "y-dinner", topic: "dinner", prompt: "The best dinner is…", choices: ["pizza", "pasta", "tacos"] },
  { id: "y-help", topic: "helping at home", prompt: "The best job to help with at home is…", choices: ["setting the table", "watering plants or feeding a pet", "putting toys away"] },
];
const sameOlder: SameQuestion[] = [
  { id: "o-trip", topic: "family trips", prompt: "Our ideal family trip is…", choices: ["mountains or woods", "a big city", "a beach"] },
  { id: "o-movie-pick", topic: "picking the movie", prompt: "The fairest way to pick the movie is…", choices: ["take turns", "everyone votes", "flip a coin"] },
  { id: "o-house-rule", topic: "house rules", prompt: "The house rule that matters most is…", choices: ["be kind", "tell the truth", "clean up after yourself"] },
  { id: "o-upset", topic: "when someone is upset", prompt: "When someone in our family is upset, the best first move is…", choices: ["give them some space", "ask what they need", "offer a hug or a snack"] },
  { id: "o-evening", topic: "family evenings", prompt: "A perfect family evening is…", choices: ["cooking together", "a game night", "everyone cozy with their own thing"] },
];
const sameOlderMore: SameQuestion[] = [
  { id: "o-screens", topic: "screen time", prompt: "On a school night, fair screen time is…", choices: ["under an hour", "an hour or two", "it depends on the night"] },
  { id: "o-phones-dinner", topic: "phones at dinner", prompt: "Phones at the dinner table?", choices: ["never", "only to look something up together", "fine if it’s a quiet night"] },
  { id: "o-allowance", topic: "allowance", prompt: "An allowance should be…", choices: ["earned with chores", "the same every week", "only for special things"] },
  { id: "o-bedtime", topic: "weekend bedtime", prompt: "On weekends, bedtime should be…", choices: ["the same as school nights", "a bit later", "whenever we’re tired"] },
  { id: "o-chores", topic: "chores", prompt: "The fairest way to split chores is…", choices: ["a chart that rotates", "everyone picks their own", "whoever’s home does it"] },
  { id: "o-friends", topic: "friends over", prompt: "Friends over on a school night?", choices: ["sure, once homework’s done", "weekends only", "ask each time"] },
  { id: "o-saturday", topic: "free Saturdays", prompt: "A free Saturday should be…", choices: ["out of the house together", "everyone doing their own thing", "a lazy day at home"] },
];
const sameAdult: SameQuestion[] = [
  { id: "a-bedtime-late", topic: "bedtime", prompt: "Bedtime is running 30 minutes late. What do we do?", choices: ["Lights out now, no extras", "Shorter routine, keep the cuddle", "Let it go tonight, reset tomorrow"] },
  { id: "a-bored", topic: "boredom", prompt: "A child says, “I’m bored.” The best answer is…", choices: ["Boredom is fine; you’ll find something", "Offer two ideas to choose from", "Let’s do something together"] },
  { id: "a-screens-dinner", topic: "screens at dinner", prompt: "Screens at the dinner table?", choices: ["Never", "Only something we watch together", "Fine on special nights"] },
  { id: "a-saturday", topic: "weekend plans", prompt: "A free Saturday afternoon appears. We…", choices: ["get out of the house together", "each do our own thing", "tackle a project as a team"] },
  { id: "a-toy", topic: "money and treats", prompt: "A child asks for a new toy they’ve wanted for weeks.", choices: ["They save up for it", "It waits for a birthday or holiday", "Yes, if it’s small"] },
  { id: "a-unkind", topic: "unkind words", prompt: "Someone says something unkind at the table. First move?", choices: ["Name it calmly, right then", "Talk to them afterwards, privately", "Let it go unless it happens again"] },
];
const sameAdultMore: SameQuestion[] = [
  { id: "a-homework", topic: "homework", prompt: "It’s 8 pm and the homework isn’t done.", choices: ["Finish it now, then bed", "Bed now; it can wait", "Let them explain it to the teacher"] },
  { id: "a-sleepover", topic: "sleepovers", prompt: "A first sleepover invitation arrives.", choices: ["Yes, if we know the family", "Not yet; a late pickup instead", "Talk it through with them first"] },
  { id: "a-phone", topic: "a first phone", prompt: "When should a child get their own phone?", choices: ["Before middle school", "Around 13 or 14", "When they can pay for part of it"] },
  { id: "a-sick", topic: "sick mornings", prompt: "A child feels sick on a school morning, but there’s no fever.", choices: ["Go in; call if it gets worse", "Stay home and rest", "A slow start, then go in late"] },
  { id: "a-squabble", topic: "squabbles", prompt: "The kids are squabbling over one toy.", choices: ["Let them sort it out", "Step in and set a timer", "The toy takes a break"] },
  { id: "a-grandparents", topic: "grandparents’ rules", prompt: "A grandparent gives a treat we’d usually say no to.", choices: ["Their house, their rules", "Ask them gently to check first", "Fine on special occasions"] },
];
/** The one-question lists older rounds were built from; keep their order. */
export function samePagePrompts(audience: Audience): SameQuestion[] {
  if (audience === "adult") return sameAdult;
  return audience === "under-6" || audience === "6-8" ? sameYoung : sameOlder;
}
/** Every question a five-question round can ask this age range. */
export function samePageBank(audience: Audience): SameQuestion[] {
  if (audience === "adult") return [...sameAdult, ...sameAdultMore];
  return audience === "under-6" || audience === "6-8"
    ? [...sameYoung, ...sameYoungMore]
    : [...sameOlder, ...sameOlderMore];
}
const allSame = [
  ...sameYoung,
  ...sameYoungMore,
  ...sameOlder,
  ...sameOlderMore,
  ...sameAdult,
  ...sameAdultMore,
];
export const samePageQuestion = (id: string) => allSame.find((q) => q.id === id);

// "Spot it!" — a card of nine things to spot from the car. Square ids are
// stored in open rounds and play records: never reorder, reword the meaning
// of, or remove a square; add new ones.
export type SpotSquare = { id: string; text: string };
export const SPOT_SIZE = 9;
// Under-6s: big, common things a small child can see and name.
const spotYoung: SpotSquare[] = [
  { id: "y-cow", text: "A cow" },
  { id: "y-red-car", text: "A red car" },
  { id: "y-bridge", text: "A bridge" },
  { id: "y-dog-car", text: "A dog in a car" },
  { id: "y-big-truck", text: "A big truck" },
  { id: "y-horse", text: "A horse" },
  { id: "y-school-bus", text: "A school bus" },
  { id: "y-motorcycle", text: "A motorcycle" },
  { id: "y-tractor", text: "A tractor" },
  { id: "y-airplane", text: "An airplane" },
  { id: "y-train", text: "A train" },
  { id: "y-police-car", text: "A police car" },
  { id: "y-yellow-car", text: "A yellow car" },
  { id: "y-bird-wire", text: "A bird on a wire" },
  { id: "y-stop-sign", text: "A stop sign" },
  { id: "y-flag", text: "A flag" },
  { id: "y-sheep", text: "Some sheep" },
  { id: "y-boat", text: "A boat" },
  { id: "y-fire-truck", text: "A fire truck" },
  { id: "y-bike", text: "Someone on a bike" },
  { id: "y-water", text: "A river or a lake" },
  { id: "y-digger", text: "A digger" },
  { id: "y-red-barn", text: "A red barn" },
  { id: "y-tunnel", text: "A tunnel" },
];
// Everyone older: things that take a sharper eye, or a little reading.
const spotOlder: SpotSquare[] = [
  { id: "o-plate", text: "A license plate from another state" },
  { id: "o-water-tower", text: "A water tower" },
  { id: "o-horse-trailer", text: "A horse trailer" },
  { id: "o-sign-100", text: "A sign with a number over 100" },
  { id: "o-boat-tow", text: "A car towing a boat" },
  { id: "o-convertible", text: "A convertible with the top down" },
  { id: "o-turbine", text: "A wind turbine" },
  { id: "o-camper", text: "An RV or a camper" },
  { id: "o-bike-rack", text: "Bikes on the back of a car" },
  { id: "o-roof-box", text: "A car with a roof box" },
  { id: "o-same-car", text: "A car just like ours" },
  { id: "o-line-sign", text: "A state or county line sign" },
  { id: "o-funny-town", text: "A town with a funny name" },
  { id: "o-hawk", text: "A hawk on a post" },
  { id: "o-cones", text: "Road-work cones" },
  { id: "o-tow-truck", text: "A tow truck" },
  { id: "o-food-truck", text: "A food truck" },
  { id: "o-steeple", text: "A church steeple" },
  { id: "o-silo", text: "A silo" },
  { id: "o-moving-truck", text: "A moving truck" },
  { id: "o-wave", text: "Someone waving back" },
  { id: "o-mile-zero", text: "A mile marker ending in 0" },
  { id: "o-long-train", text: "A train with more than 20 cars" },
  { id: "o-billboard-animal", text: "A billboard with an animal on it" },
];
/** Every square a card can hold for this age range. */
export function spotBank(audience: Audience): SpotSquare[] {
  return audience === "under-6" ? spotYoung : spotOlder;
}
const allSpot = [...spotYoung, ...spotOlder];
export const spotSquare = (id: string) => allSpot.find((x) => x.id === id);

// "Day's highlights" — three questions for each person at the end of a
// driving day, with a few quick picks the holder can tap for a child.
export type DayQuestion = "best" | "hard" | "next";
const dayPicks: Record<"kids" | "grown", Record<DayQuestion, string[]>> = {
  kids: {
    best: [
      "the snacks",
      "the swimming pool",
      "the playground",
      "a game in the car",
      "seeing animals",
      "ice cream",
    ],
    hard: [
      "being stuck in the car",
      "feeling carsick",
      "being bored",
      "a fight in the back seat",
      "being tired",
      "missing home",
    ],
    next: [
      "the beach",
      "the swimming pool",
      "seeing family",
      "the next stop",
      "sleeping in",
      "getting home",
    ],
  },
  grown: {
    best: [
      "the scenery",
      "a good meal",
      "everyone laughing",
      "a good talk",
      "a walk",
      "getting there",
    ],
    hard: [
      "traffic",
      "the long hours",
      "everyone tired at once",
      "a wrong turn",
      "the heat",
      "not enough sleep",
    ],
    next: [
      "a slow morning",
      "the next stop",
      "seeing family",
      "a swim",
      "a good meal",
      "getting home",
    ],
  },
};
/** Quick picks for one question, fitted to the person's age when it's known. */
export function dayQuickPicks(question: DayQuestion, audience?: Audience) {
  return dayPicks[audience === "adult" || audience === "13-17" ? "grown" : "kids"][
    question
  ];
}

// The pass-and-play games as they appear in Do something.
export const games: {
  kind: "joy" | "story" | "match" | "spot";
  title: string;
  blurb: string;
  short: string;
  tags: Tag[];
}[] = [
  {
    kind: "match",
    title: "Same page?",
    blurb: "Five quick questions, answered in private. See where you match, and where you don’t.",
    short: "5–10 min",
    tags: ["kids"],
  },
  {
    kind: "joy",
    title: "Guess my small joy",
    blurb: "Everyone picks a small joy in secret, then guesses each other’s. See who knows whom best.",
    short: "5–10 min",
    tags: ["kids"],
  },
  {
    kind: "story",
    title: "One story, many voices",
    blurb: "Build a silly adventure, one part each. Read the whole story together at the end.",
    short: "5–10 min",
    tags: ["kids"],
  },
  {
    kind: "spot",
    title: "Spot it!",
    blurb: "A card of nine things to spot from the car. Call it out first and the square is yours.",
    short: "Any length",
    tags: ["kids", "trip"],
  },
];
