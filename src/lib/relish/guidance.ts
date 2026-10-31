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
type Thread = {
  title: string;
  notice: string;
  practice: string;
  instruction: string;
};
const childThreads: Record<AgeBand, Record<ThreadId, Thread>> = {
  "under-6": {
    listen: {
      title: "Take turns",
      notice: "How did it feel to play with someone today?",
      practice: "Try taking a turn.",
      instruction:
        "With your grown-up, roll a ball or build a tower. Say “your turn” and “my turn.” You can stop whenever you want.",
    },
    ask: {
      title: "Ask for help",
      notice: "How did you feel when you needed help today?",
      practice: "Try “Help, please.”",
      instruction:
        "If something is tricky, ask a grown-up you trust for help. You do not have to do it alone.",
    },
    joy: {
      title: "Find a little happy",
      notice: "How did you feel about a little thing today?",
      practice: "Choose a little happy thing.",
      instruction:
        "Pick a song, a funny face or a story to enjoy with your grown-up. It is okay to choose quiet time too.",
    },
  },
  "6-8": {
    listen: {
      title: "Give each other a turn",
      notice: "How did you feel when you played or talked with someone today?",
      practice: "Take turns sharing one idea.",
      instruction:
        "Ask someone you trust to tell you one thing about their day. Then take your own turn. You can both pass.",
    },
    ask: {
      title: "Say what would help",
      notice: "How did you feel when you wanted someone to understand you?",
      practice: "Try “Could you help me with…?”",
      instruction:
        "Choose a grown-up you trust. Ask for one small thing you need, like help with a task or a quiet break. Their feelings are not your job to fix.",
    },
    joy: {
      title: "Notice a small good thing",
      notice: "How did you feel about a small moment in your day?",
      practice: "Invite someone to do a little fun thing.",
      instruction:
        "Offer a game, a drawing or a story. They can say yes or no, and so can you.",
    },
  },
  "9-12": {
    listen: {
      title: "Make room for both voices",
      notice: "When did you feel heard—or wish you had been?",
      practice: "Ask one curious question.",
      instruction:
        "In a conversation with someone you trust, ask “What was that like for you?” You get a turn too. Listening does not mean agreeing.",
    },
    ask: {
      title: "Let someone know what I need",
      notice: "Was there a moment you wanted help, space or a say?",
      practice: "Make one clear request.",
      instruction:
        "Try “Could we…” or “I need a break.” You can ask a trusted adult for support. You are not responsible for sorting out adults’ disagreements.",
    },
    joy: {
      title: "Make space for what I enjoy",
      notice: "What gave you a little energy or made you smile?",
      practice: "Make a small invitation.",
      instruction:
        "Invite someone to do something you enjoy, or make time for it yourself. Leave room for each person to choose.",
    },
  },
  "13-17": {
    listen: {
      title: "Be heard, and hear someone else",
      notice:
        "Where did a conversation leave you feeling understood—or misunderstood?",
      practice: "Check what kind of support is wanted.",
      instruction:
        "With someone you feel safe talking to, try “Do you want me to listen, or help think it through?” You can ask for the same care in return.",
    },
    ask: {
      title: "Say what I need; keep my boundaries",
      notice: "When did you want more space, support or a say in something?",
      practice: "Put one need into words.",
      instruction:
        "Try “I’d like…” or “I’m not comfortable with that.” You can pause a conversation. If it feels unsafe, talk with a trusted adult instead of trying to resolve it alone.",
    },
    joy: {
      title: "Make room for what matters to me",
      notice: "What felt like your own kind of good today?",
      practice: "Choose something worth making time for.",
      instruction:
        "Make a small plan for an interest, some rest or time with someone you trust. An invitation leaves everyone free to choose.",
    },
  },
};
export function guidanceFor(book: Pick<Book, "profile">) {
  const audience = audienceOf(book);
  if (audience === "adult")
    return {
      threads: threads as Record<ThreadId, Thread>,
      plans,
      outcomes,
      intro:
        "Choose one thing you would like to make a little easier in your relationships.",
      cue: "",
      choices: [] as string[],
      opportunities: [
        "the next conversation",
        "a meal together",
        "a quiet moment side by side",
        "when I have a little room",
      ],
      placeholder: "One small moment is enough…",
      maxLength: 3000,
    };
  const young = audience === "under-6" || audience === "6-8";
  const time =
    audience === "under-6"
      ? "About 1 minute · together"
      : audience === "6-8"
        ? "About 1–2 minutes"
        : "About 2–3 minutes";
  const ending = young
    ? "Pick a path, then choose a feeling or add a few words. That is enough. You can pause at any time."
    : "Choose a direction and keep one small moment. You can leave anything unwritten and pause whenever you like.";
  const childPlans: Record<
    SessionKind,
    { title: string; time: string; end: string; next: string }
  > = {
    begin: {
      title: young
        ? "One little moment from today"
        : "One moment that matters to you",
      time,
      end: ending,
      next: young
        ? "Another day, try a little thing or play together. There is no homework."
        : "On another visit, try one small thing or play together. There is nothing to catch up on.",
    },
    notice: {
      title: young
        ? "How was your little moment?"
        : "A moment in your own words",
      time,
      end: young
        ? "Choose a feeling or a few words, then finish here. Passing is okay too."
        : "A few words are enough. You do not have to explain everything or share it.",
      next: "Another day, choose a small thing to try. There is no deadline.",
    },
    practice: {
      title: young
        ? "One little thing to try"
        : "One small choice for your day",
      time: young ? "About 1 minute · then go and play" : "About 1 minute",
      end: "Choose a time to try one small thing. Then close the book. You do not have to do it now.",
      next: "After you try, come back if you want to say how it went.",
    },
    reflect: {
      title: young ? "How did it go?" : "What did you notice when you tried?",
      time,
      end: young
        ? "Choose what fits. No extra words needed. Then you are finished."
        : "Choose what fits your experience. Extra words are optional, and “I need more time” is a complete answer.",
      next: "Enough for today. Your next visit can wait.",
    },
  };
  const childOutcomes: Record<Outcome, string> = young
    ? {
        helped: "It helped a little",
        adjust: "I want to try another way",
        time: "I’m not sure yet",
      }
    : {
        helped: "Something helped",
        adjust: "I’d try something different",
        time: "I need more time",
      };
  return {
    threads: childThreads[audience],
    plans: childPlans,
    outcomes: childOutcomes,
    intro: young
      ? "Pick what you want to explore today. There are no right answers."
      : "Choose something that matters to you. This book is for your words, at your pace.",
    cue:
      audience === "under-6"
        ? "Grown-up: read aloud and let your child point, speak or choose. Help with words only if they want. Passing is always welcome."
        : audience === "6-8"
          ? "You can choose a feeling, write a few words, or ask a trusted grown-up to help. You can also pause."
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
          "when I talk with someone I trust",
          "during a break",
          "when I feel ready",
          "another day",
        ],
    placeholder: young
      ? "A word or a little moment…"
      : "Only what you feel like putting into words…",
    maxLength: young ? 500 : 1500,
  };
}
