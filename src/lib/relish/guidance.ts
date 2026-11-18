import type { Book } from "./model";
import {
  threads,
  plans,
  outcomes,
  type ThreadId,
  type SessionKind,
  type Outcome,
} from "./living";
import { audienceOf, type AgeBand } from "./profiles";
export type Thread = {
  /** The situation, in the writer's own voice. */
  title: string;
  /** One line under the situation that helps someone recognize it. */
  lead: string;
  /** The one question on the writing page. */
  notice: string;
  /** The small thing to try, if they make a plan. */
  practice: string;
  instruction: string;
  /** An example plan, shown as a placeholder. */
  planExample: string;
};
// Children's topics stay on the same three stored ids as adults' (listen /
// ask / joy) and are written for each age band. Every question can be
// answered from the child's own day; none assumes something went wrong.
const childThreads: Record<AgeBand, Record<ThreadId, Thread>> = {
  "under-6": {
    listen: {
      title: "Playing with someone",
      lead: "Taking turns, sharing, playing together",
      notice: "Who did you play with today? What did you play?",
      practice: "Take turns.",
      instruction:
        "With your grown-up, roll a ball or build a tower. Say “your turn” and “my turn.” You can stop whenever you want.",
      planExample: "Build a tower with Dad",
    },
    ask: {
      title: "When something was tricky",
      lead: "Shoes, buttons, big feelings",
      notice: "Was something tricky today? What happened?",
      practice: "Say “Help, please.”",
      instruction:
        "If something is tricky, ask a grown-up you trust for help. You do not have to do it alone.",
      planExample: "Say “help, please” with my shoes",
    },
    joy: {
      title: "Something fun",
      lead: "Something that made you happy",
      notice: "What was fun today?",
      practice: "Choose something fun to do again.",
      instruction:
        "Pick a song, a funny face or a story to enjoy with your grown-up. It is okay to choose quiet time too.",
      planExample: "Sing the silly song again",
    },
  },
  "6-8": {
    listen: {
      title: "Playing or talking with someone",
      lead: "A friend, a brother or sister, a grown-up",
      notice: "Who did you play or talk with today? What happened?",
      practice: "Take turns sharing one idea.",
      instruction:
        "Ask someone you trust to tell you one thing about their day. Then take your own turn. You can both pass.",
      planExample: "Ask Mom about her day at dinner",
    },
    ask: {
      title: "When I wanted help",
      lead: "Or wanted someone to understand",
      notice:
        "Was there a time today you wanted help, or wanted someone to understand? What happened?",
      practice: "Try “Could you help me with…?”",
      instruction:
        "Choose a grown-up you trust. Ask for one small thing you need, like help with a task or a quiet break. Their feelings are not your job to fix.",
      planExample: "Ask for help with my reading folder",
    },
    joy: {
      title: "Something I enjoyed",
      lead: "A game, a place, a person",
      notice: "What did you enjoy today?",
      practice: "Invite someone to play.",
      instruction:
        "Offer a game, a drawing or a story. They can say yes or no, and so can you.",
      planExample: "Ask my sister to draw with me",
    },
  },
  "9-12": {
    listen: {
      title: "Being listened to",
      lead: "Or wishing someone had listened",
      notice:
        "Was there a time today you felt listened to, or wished you had been? What happened?",
      practice: "Ask one curious question.",
      instruction:
        "In a conversation with someone you trust, ask “What was that like for you?” You get a turn too. Listening does not mean agreeing.",
      planExample: "Ask Dad what his day was like",
    },
    ask: {
      title: "Something I needed",
      lead: "Help, some space, or a say",
      notice:
        "Was there a moment you wanted help, space or a say? What happened?",
      practice: "Make one clear request.",
      instruction:
        "Try “Could we…” or “I need a break.” You can ask a trusted adult for support. You are not responsible for sorting out adults’ disagreements.",
      planExample: "Ask for ten minutes before homework",
    },
    joy: {
      title: "Something I enjoyed",
      lead: "An interest, a friend, a good hour",
      notice: "What did you enjoy today? What made it good?",
      practice: "Invite someone to join you.",
      instruction:
        "Invite someone to do something you enjoy, or make time for it yourself. Leave room for each person to choose.",
      planExample: "Show Sam the comic I’m drawing",
    },
  },
  "13-17": {
    listen: {
      title: "A conversation that stuck with me",
      lead: "Feeling understood, or not",
      notice:
        "Which conversation left you feeling understood, or misunderstood? What happened?",
      practice: "Check what kind of support is wanted.",
      instruction:
        "With someone you feel safe talking to, try “Do you want me to listen, or help think it through?” You can ask for the same care in return.",
      planExample: "Ask Jo whether she wants advice or just to vent",
    },
    ask: {
      title: "Something I needed to say",
      lead: "More space, support, or a say",
      notice:
        "When did you want more space, support or a say in something? What happened?",
      practice: "Put one need into words.",
      instruction:
        "Try “I’d like…” or “I’m not comfortable with that.” You can pause a conversation. If it feels unsafe, talk with a trusted adult instead of trying to resolve it alone.",
      planExample: "Tell Mom I need Sunday mornings to myself",
    },
    joy: {
      title: "Something worth more time",
      lead: "An interest, some rest, a person",
      notice: "What did you enjoy today? What made it worth it?",
      practice: "Choose something worth making time for.",
      instruction:
        "Make a small plan for an interest, some rest or time with someone you trust. An invitation leaves everyone free to choose.",
      planExample: "Keep Thursday evening for guitar",
    },
  },
};
/** The words around the guided pages: headings, buttons and endings. */
export type GuidedWords = {
  /** Heading above the topic choices. */
  choose: string;
  chooseHint: string;
  /** Left page, before a topic is chosen. */
  welcome: string;
  /** Left page: what this is, once. */
  about: string;
  saveMoment: string;
  momentKept: string;
  stop: string;
  makePlan: string;
  planLabel: string;
  savePlan: string;
  planKept: string;
  planLater: string;
  askTried: string;
  tried: string;
  notYet: string;
  howWent: string;
  saveHow: string;
};
const adultWords: GuidedWords = {
  choose: "What happened?",
  chooseHint: "Pick the one closest to your moment.",
  welcome: "Something on your mind?",
  about:
    "Write down one moment. That can be the whole thing. If you want, make a small plan to try, and next time note how it went.",
  saveMoment: "Save this moment",
  momentKept: "That moment is kept.",
  stop: "That’s a good place to stop. You’ll find it in Your book.",
  makePlan: "Make a small plan",
  planLabel: "What you’ll try, and when",
  savePlan: "Save my plan",
  planKept: "Your plan is kept.",
  planLater:
    "Next time you open Think it through, it will ask how it went. Nothing else to do now.",
  askTried: "Did you get a chance to try it?",
  tried: "Yes, I tried it",
  notYet: "Not yet",
  howWent: "How did it go?",
  saveHow: "Save how it went",
};
export function guidanceFor(book: Pick<Book, "profile">) {
  const audience = audienceOf(book);
  if (audience === "adult")
    return {
      threads: threads as Record<ThreadId, Thread>,
      plans,
      outcomes,
      words: adultWords,
      intro: adultWords.chooseHint,
      cue: "",
      choices: [] as string[],
      opportunities: [
        "after dinner",
        "at bedtime",
        "the next time it comes up",
        "this weekend",
      ],
      placeholder: "What happened, in a sentence or two…",
      maxLength: 3000,
    };
  const young = audience === "under-6" || audience === "6-8";
  const time =
    audience === "under-6"
      ? "About 1 minute · together"
      : audience === "6-8"
        ? "About 1–2 minutes"
        : "About 2–3 minutes";
  const childPlans: Record<
    SessionKind,
    { title: string; time: string; end: string; next: string }
  > = {
    begin: {
      title: young ? "What happened today?" : "Write down one moment",
      time,
      end: young
        ? "Pick one, then choose a feeling or say a few words. That’s it."
        : "Pick one, write a few words, and save. That can be the whole thing.",
      next: young
        ? "Another day, you can choose something to try."
        : "If you want, make a small plan to try.",
    },
    notice: {
      title: young ? "What happened today?" : "Write down another moment",
      time,
      end: young
        ? "Choose a feeling or say a few words. That’s it."
        : "Write a few words and save. That can be the whole thing.",
      next: young
        ? "Another day, you can choose something to try."
        : "If you want, make a small plan to try.",
    },
    practice: {
      title: young ? "Choose something to try" : "Make a small plan",
      time: "About 1 minute",
      end: "Say what you’ll try, then save it.",
      next: "Next time, you can say how it went.",
    },
    reflect: {
      title: "How did it go?",
      time,
      end: "Say how it went, then save. Extra words are up to you.",
      next: "Write about another day whenever you like.",
    },
  };
  const childOutcomes: Record<Outcome, string> = young
    ? {
        helped: "It helped a little",
        adjust: "I want to try another way",
        time: "I’m not sure yet",
      }
    : {
        helped: "It helped",
        adjust: "I’d try something different",
        time: "Too soon to tell",
      };
  const words: GuidedWords = {
    choose:
      audience === "under-6"
        ? "What shall we write about?"
        : "What do you want to write about?",
    chooseHint: young ? "Pick one." : "Pick the one closest to your day.",
    welcome: young ? "Your page for today" : "Something from today?",
    about: young
      ? "Pick something from today and say how it felt. You can stop after that."
      : "Write down one moment from your day. You can stop after that, or make a small plan to try.",
    saveMoment: young ? "Keep my page" : "Save this moment",
    momentKept: young ? "Your page is kept." : "That moment is kept.",
    stop: young
      ? "That’s a good place to stop. It’s in your book."
      : "That’s a good place to stop. It’s in your book.",
    makePlan: young ? "Choose something to try" : "Make a small plan",
    planLabel: young ? "What you’ll try" : "What you’ll try, and when",
    savePlan: young ? "Keep my plan" : "Save my plan",
    planKept: young ? "Your plan is kept." : "Your plan is kept.",
    planLater: young
      ? "Next time, you can say how it went."
      : "Next time you open Think it through, you can say how it went.",
    askTried: young ? "Did you get to try it?" : "Did you get a chance to try it?",
    tried: young ? "Yes, I tried it" : "Yes, I tried it",
    notYet: "Not yet",
    howWent: "How did it go?",
    saveHow: young ? "Keep this" : "Save how it went",
  };
  return {
    threads: childThreads[audience],
    plans: childPlans,
    outcomes: childOutcomes,
    words,
    intro: words.chooseHint,
    cue:
      audience === "under-6"
        ? "Grown-up: read this aloud. Your child can point, talk or choose, and you can write their words down. Passing is fine."
        : audience === "6-8"
          ? "You can pick a feeling, write a few words, or ask a grown-up to write for you. You can stop any time."
          : audience === "9-12"
            ? "Your words are yours. If something feels worrying or unsafe, talk to a trusted adult."
            : "Your words are yours. If something feels worrying or unsafe, you can talk to a trusted adult. You never have to fix someone else’s feelings.",
    choices: young
      ? [
          "I felt happy.",
          "I felt sad.",
          "I felt cross.",
          "I’m not sure how I felt.",
        ]
      : [],
    opportunities: young
      ? [
          "next time we play",
          "at snack time",
          "when my grown-up can help",
          "another day",
        ]
      : [
          "after school",
          "during a break",
          "when I feel ready",
          "this weekend",
        ],
    placeholder: young
      ? "Choose a feeling or write here…"
      : "What happened, in a few words…",
    maxLength: young ? 500 : 1500,
  };
}
