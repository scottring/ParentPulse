# Relish activities and games: audit and redesign

2026-11-18 · Read-only review of the `longer-auto-lock` worktree (`src/lib/relish/tools.ts`, `play-content.ts`, `living.ts`, `guidance.ts`, `nudges.ts`, `catalog.ts`; runners `Tools.tsx`, `GroupPlay.tsx`, `VisitEditor.tsx`). No code was changed.

## 1. Verdict

Scott's sense is right, but the reason is narrow. The beginnings are good: most activities name a real moment and say how long they take, and the "Finished when" line is honest. The middles are mostly fine. **The weak part is the ending.** Every exercise ends with a page that repeats your answers back to you ("Helps me: Music; A hug."). Nothing counts, compares or summarizes them. Nothing comes back later either. Think it through is the only activity that asks "Did you get a chance to try it?"

The games are thinner than the exercises. **Same page?** asks a single question per game. **Guess my small joy** promises "see who knows them best" but never says who guessed right. **One story** lets players choose only from pre-written lines.

The good news is that most of the fix is **deterministic**: count, compare and recall the person's own words. No AI is needed. Two shared building blocks would lift about ten activities at once:
- a **result card**: a few lines worked out from the person's answers;
- a **check-back**: their own next step, asked about again a few days later, reusing the plan, "tried it?" and outcome loop Think it through already has.

**Rubric** (each item is rated Strong / Thin / Missing):
- **Occasion:** when would a real family reach for this?
- **Beginning:** the setup and the reason to do it.
- **Middle:** the steps and prompts. Are they substantive?
- **End:** what concrete thing is made or kept.
- **Insight:** what the person learns, worked out from their own answers.
- **Follow-up:** whether anything comes back later.
- **Age fit:** whether it suits each age band it's offered to.
- **Evidence:** the recognized practice it draws on, named only where it really fits.

## 2. Scorecard

S = Strong · T = Thin · M = Missing. "Ages" shows who sees it, from `audiences` in the code.

| Activity (ages) | Occasion | Beginning | Middle | End | Insight | Follow-up | Age fit | Evidence |
|---|---|---|---|---|---|---|---|---|
| Think it through, adult | S | S | T | S | M | **S** | S | T |
| Think it through, child bands | S | S | T | S | M | T | S | T |
| What helps when I'm upset, adult | T | S | S | T | M | M | S | T |
| What helps, child (4–17, one card set) | T | S | S | T | M | M | **T** | T |
| Drains and fills (9+) | T | S | S | T | M | M | T | T |
| What's under the behavior? (adult) | S | S | S | T | M | M | S | S |
| Who carries what (adult) | T | S | S | T | M | M | S | S |
| Rewrite the opener (adult) | S | S | **S** | S | T | M | S | S |
| Put a thought on trial (13+) | T | S | S | S | T | M | T | S |
| Notice the unseen work (9+) | T | S | T | S | M | M | T | T |
| Plan a repair (adult) | S | S | S | S | M | M | S | S |
| Ten real hellos (adult) | S | S | T | T | M | T | S | S |
| A week of specific thanks (9+) | T | S | T | T | M | T | S | S |
| Repair bingo (adult) | S | S | T | T | M | T | S | S |
| Kindness spotting (kids) | S | T | T | T | M | T | T | T |
| Same page?, adult | T | S | T | T | T | M | S | T |
| Same page?, kids | T | S | T | T | T | M | T | M |
| Guess my small joy (all) | T | S | T | T | M | M | T | T |
| One story, many voices (all) | S | S | T | S | n/a (play) | M | S | n/a |

**Specific problems found in the code**
- **Same page?** picks one question per game, chosen from the game's ID (`samePageRound`). The reveal is one line: "2 of 3 chose 'take turns'." The Home suggestion sells it as "About 10 minutes… Everyone guesses, nobody is wrong." It is 3–5 minutes, and nobody guesses.
- **Guess my small joy** offers 4 fixed options, so a random guess is right 1 time in 4. The reveal lists the guesses but never marks which ones were right, even though the blurb promises "See who knows them best." Only one person is guessed about per game.
- **One story** has 5–6 prompts per age band with 3 choices each. Players can't add their own words, so stories repeat after a few plays. With 2 players the story is only 3 turns.
- **Repair bingo** can mark each square only once (`toggleMark`). So "Find out which ones land" can't be answered: two weeks of use looks the same as one lucky day. Nothing records what happened.
- **Kindness spotting** shows the repair-bingo celebration "Bingo. Those moves work for you." (`Tools.tsx`). That sentence is wrong for kindness. It also doesn't record who was kind.
- **Who carries what** ends: "The other person can sort the same list… compare when you're both ready." There is no way to compare. The blurb promises "see the split on one page," but the page only lists the piles, with no counts.
- **Plan a repair** ends with "choose a time to say it," but there's no field for a time. Like Unseen work, What's under the behavior? and Drains and fills, it sets up a "this week" step that nothing ever asks about.
- **Trackers:** you can only mark today. Missed days aren't shown, so the ten dots fill left to right whatever the dates. "Stop without keeping" deletes the run.
- **Age fit:** teens get the same "What helps" cards as 4-year-olds, including "A grown-up sitting with me." Teens doing Thought on trial see the parent example "I'm failing as a parent."

## 3. Redesign cards

Each card covers beginning → middle → end, the **insight** it would produce, what **comes back** later, the age variants, and a call: **Keep**, **Rework** or **Cut**.

**Think it through** · *Keep and extend*
- **B/M/E:** Leave as is. It's the best-built loop in the app.
- **Insight:** Add a "Looking back" card after 5 or more moments, for example: "4 of your 6 moments were 'I jumped in with advice.' You tried 3 plans; 2 helped." Draw this from the stored `thread` and `outcome`.
- **Comes back:** It already does. Add a Home invitation 2 days after a plan is saved, using the plan's own words.
- **Ages:** Young children get 6–8 feeling chips (add tired, proud, worried, excited) instead of 4.
- **Evidence:** Each topic has a good fit. "Advice" fits emotion coaching and Faber & Mazlish. "Ask" fits an NVC-style request. "More moments" fits savoring.

**What helps when I'm upset** · *Rework*
- **B:** "Do this on a calm day, so the list is ready for a hard one."
- **M:** Same sort, but pick up to 3 "helps" and one "please don't."
- **E:** A short "My helps" card: "When I'm upset: give me a minute, then a hug. Please don't fix it right away." The card is the thing to show family.
- **Insight:** "You said Talking it through only sometimes helps, but Being asked what I need always does."
- **Comes back:** After the next journal entry tagged as hard, ask "Did your list help?"
- **Ages:** Separate card sets for under 6 (5 picture-style cards, read aloud), 6–8, 9–12, and teens (texting a friend, headphones, being left alone without being asked why).

**Drains and fills** · *Rework*
- **E:** Add a count line: "7 drains, 3 fills. Most drains are before 9 am." To group by time of day, tag each card morning / day / evening.
- **Comes back:** In 7 days: "You wanted to shrink 'Email and messages.' Did it shrink?" Answer with the three outcome chips.
- **Ages:** Separate lists for 9–12 and teens.

**What's under the behavior?** · *Keep, add a check-back*
- **E:** Keep. Add "What I'll try instead," with 3 chips matched to the guess. For example, the guess Hungry offers "snack before homework."
- **Insight:** Across several runs: "Tired was your top guess 3 times for Kaleb."
- **Comes back:** In 3–4 days: "You guessed Tired. When you responded to that, what changed?"
- **Evidence:** Ross Greene's "kids do well if they can" and lagging-skills thinking. It fits the "missing a skill" card.

**Who carries what** · *Rework (high value)*
- **E:** A split card: "Mostly me: 9 of 14 · Mostly them: 2 · Shared: 3. 5 of the 6 noticing-and-planning jobs are yours." To support this, mark each card as noticing/planning or doing.
- **Comes back:** "Compare with Iris." Both sort in their own books, and each sends their sort as an excerpt using the existing approved sharing. The compare card shows where the two views differ ("You both say Bedtime is shared").
- **Evidence:** Fair Play (Rodsky) and research on cognitive household labor. Both fit squarely.

**Rewrite the opener** · *Keep, add a check-back*
- **M:** Already strong, with its live checks. Add one optional field: "When will you say it?"
- **Comes back:** "You planned to say: 'I feel worn out about…' Did you say it? How did it land?" Answer with the three outcome chips and an optional line.
- **Evidence:** Gottman's softened start-up and NVC's feeling-need-request. Both fit.

**Put a thought on trial** · *Keep, small fixes*
- **E:** Show the verdict next to the fairer thought.
- **Insight:** Over time: "Your harsh thoughts are mostly about being a parent; most verdicts were 'Partly true.'"
- **Comes back:** "Read your fairer thought again?" offered from Your book, not pushed.
- **Ages:** Teen examples about school or friends, not parenting.
- **Evidence:** A CBT thought record. It fits well.

**Notice the unseen work** · *Keep, merge the follow-up*
- **Comes back:** The next day: "Did you tell Iris? How did she take it?" The result is added to the same page.
- **Insight:** "You've thanked 3 people for 5 unseen jobs this month."
- **Ages:** For 9–12, add simpler placeholders ("packs my lunch").

**Plan a repair** · *Keep, add a "when" and a check-back*
- **M:** Add a "When" choice ("tonight at bedtime," "tomorrow morning"), the same chips Think it through uses.
- **Comes back:** At the chosen time or the next day: "Did you get to say it? What did they say back?" The answer is saved with the plan.
- **Evidence:** Rupture and repair (Tronick; Siegel) for parent and child, and Gottman for partners.

**Ten real hellos** · *Rework the ending*
- **M:** Show real dates, including missed ones. Add an optional note: "What did they do?"
- **E:** "8 of 10 days, over 13 days. Mornings stuck; after-school didn't." To support this, the hello gets a morning / after-school / evening chip. Then ask one closing question: "Did anything change?" with outcome chips.
- **Evidence:** Gottman's rituals of connection and "six-second kiss" idea. It's fine to name.

**A week of specific thanks** · *Keep, sharpen the end*
- **E:** The page lists the thanks in their own words, which is the real keepsake. Add a closing chip: "How did they react?"
- **Insight:** "You thanked them most for things they do in the morning."

**Repair bingo** · *Rework (high value)*
- **M:** Each tap logs one use (it no longer toggles), with "helped / didn't" and an optional one-line note. The board shows the count on each square.
- **E:** After 1–2 weeks: "12 repair tries. What landed most: a break, then coming back (4 of 4). What didn't: jokes (1 of 3)." Keep a full line as a fun bonus, not the goal.
- **Comes back:** Offer "Start round two with your top 3 moves."
- **Evidence:** Gottman's repair attempts. It fits.

**Kindness spotting** · *Rework*
- **M:** Mark who was kind (chips with family names) and what they did.
- **E:** "This week you spotted 11 kind things. Ella helped clean up 3 times; Dad cheered someone on twice." Fix the celebration line, for example: "A full line of kindness!"
- **Comes back:** Offer "Tell them at dinner," and the page lists each person's kind things.
- **Ages:** Under 6: 4 picture squares, with a grown-up marking. Teens: replace it with Specific thanks, since 9 bingo squares feel young.
- **Evidence:** Positive attention ("catch them being good"). Keep the claim light.

**Same page?** · *Rework (highest value)*
- **B:** Choose a deck first: Weekend & fun, House rules, Hard moments; for adults, Co-parenting calls.
- **M:** 5 questions per game. Each player answers all 5 in private, then everyone sees one reveal after each question or all at once. Optionally, each player guesses what the others picked.
- **E:** "You matched on 3 of 5. Different on screens at dinner and the toy question." Then: "Pick one to talk about," which saves the question as a talking point.
- **Insight:** Within the game, nothing new needs to be stored. Across games, a pattern like "you've differed on screens 3 times" needs answers to be remembered. Today play records deliberately store no answers, so this is a **product decision**. One option: an approved shared page holds the answers.
- **Ages:** Kids' questions should be real opinions ("Who should pick the movie?"), not just breakfast foods.

**Guess my small joy** · *Rework (high value)*
- **M:** Rotate the chooser so everyone gets guessed about. Offer 8–12 options per age band plus "something else" (the chooser types it, and others guess from 4 options that include it).
- **E:** "Iris knew Kaleb's best (2 of 2). Kaleb's small joys: a quiet hour, building something." Then: "Plan one of these this week."
- **Comes back:** Each person's approved joys build into a small "What lights them up" list on their page in Your book.
- **Evidence:** Gottman love maps, meaning knowing someone's inner world. It fits.

**One story, many voices** · *Keep, deepen*
- **M:** Add an "Write your own line" choice, and 3× more prompts per band (shuffled). Set a minimum of 5 turns, so 2 players go around more than once.
- **E:** Keep the story page with approval. Add an optional "Give it a title" turn and a drawing or photo.
- **Comes back:** "Read last week's story aloud before starting a new one?"
- No insight needed. This one is for fun, and that's its job.

**Home suggestions (`nudges.ts`)** · *Keep, fix one*
- Correct "same-page-tonight" (wrong time; "guesses" is wrong).
- This is where the check-back belongs: one hand-written template per activity, filled with the person's own words.

## 4. Gaps (things families would expect)

1. **Dinner-table questions:** a deck of 3 conversation questions to read aloud, keeping the best answer. Today there's only one Home suggestion for this.
2. **Calm-down plan for a child:** a "when I'm about to explode" plan made with the child. What helps is close, but it's adult-led and has no steps.
3. **Weekly look-back for the family:** a 5-minute Sunday round of best moment, hard moment and one thing for next week. The editorial brief parks this as separate feature work.
4. **One-on-one time tracker:** a planned 10 minutes with each child, logged and counted per child ("Ella 3, Kaleb 1 this month").
5. **Feelings check-in for under-6:** a 30-second face-picker a grown-up does with the child at bedtime, building a week view.

## 5. Order of work and playtesting

**Rebuild first**
1. **Same page?** as 5 rounds with a match result. This is the most visible placeholder; it's played together and works for every age.
2. **Guess my small joy**, with a rotating chooser, right-guess reveal and bigger option lists. It's the same runner as Same page?, so the work is shared.
3. **The check-back.** Build it once from the Think it through plan loop and attach it to Plan a repair, Rewrite the opener and What's under the behavior?. This gives "what comes back later" to the strongest adult exercises.
4. **Repair bingo and Kindness spotting**: count each use and record who, then show the result card. It's one tracker change and fixes the wrong celebration line.

**Playtest**
- **Fake data only:** use "Explore a sample book" (the local sample mode) or a fresh local book with invented names. Never use the real family books in automated tests.
- **Scripted runs, one per activity:** start → middle → end → reopen the kept page → fake the clock forward 3 days → confirm the check-back appears in their words → answer it.
- **Family playtest** (Scott, Iris, Ella, Kaleb), at dinner on one device: play Same page? and Guess my small joy back to back. Afterwards ask each person one question: "What did you find out?" If nobody can answer, the ending still isn't doing its job. Note who reaches for "Finish for now" versus "Keep."
- **Pass/fail test for each rebuilt activity:** a person can say, in one sentence, what they learned or what they're taking with them. That's the editorial rule, made testable.
