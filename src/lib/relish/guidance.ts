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
      title: "Choose something fun",
      notice: "How did you feel today?",
      practice: "Choose something you enjoy.",
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
      title: "Something you enjoyed",
      notice: "What did you enjoy today?",
      practice: "Invite someone to play.",
      instruction:
        "Offer a game, a drawing or a story. They can say yes or no, and so can you.",
    },
  },
  "9-12": {
    listen: {
      title: "Take turns listening",
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
      title: "Make time for an interest",
      notice: "What did you enjoy today?",
      practice: "Invite someone to join you.",
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
      title: "Plan time for what matters",
      notice: "What did you enjoy today?",
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
        "Choose a topic to practice. Next, write about a related experience.",
      cue: "",
      choices: [] as string[],
      opportunities: [
        "the next conversation",
        "a meal together",
        "a quiet moment side by side",
        "when I have time",
      ],
      placeholder: "Describe what happened…",
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
    ? "Choose a topic, then select a feeling or write a few words. Save your response to finish. You can also skip or pause."
    : "Choose a topic, write about an experience or feeling, and save your response. You can skip questions or pause.";
  const childPlans: Record<
    SessionKind,
    { title: string; time: string; end: string; next: string }
  > = {
    begin: {
      title: young
        ? "What happened today?"
        : "Write about an experience",
      time,
      end: ending,
      next: young
        ? "Next time, choose a practice or a game."
        : "Next time, choose a practice plan or a game.",
    },
    notice: {
      title: young
        ? "How did you feel?"
        : "Describe what happened",
      time,
      end: young
        ? "Choose a feeling or write a few words, then save your response. You can also skip."
        : "Write a few words about what happened, then save your response. Sharing is optional.",
      next: "Next, choose something to practice.",
    },
    practice: {
      title: young
        ? "Choose something to try"
        : "Choose a practice plan",
      time: young ? "About 1 minute" : "About 1 minute",
      end: "Choose when to try the activity, then save your plan. Try it later.",
      next: "After you try it, return to record how it went.",
    },
    reflect: {
      title: young ? "How did it go?" : "What did you notice when you tried?",
      time,
      end: young
        ? "Choose how it went and save your review. Extra words are optional."
        : "Choose how it went and save your review. Extra words are optional. You can choose “I need more time”.",
      next: "Review saved. You can return to Activities.",
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
      ? "Choose a topic. Next, pick a feeling or write a few words."
      : "Choose a topic below. Next, answer a prompt about an experience or feeling.",
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
      ? "Choose a feeling or write here…"
      : "Write your response…",
    maxLength: young ? 500 : 1500,
  };
}
