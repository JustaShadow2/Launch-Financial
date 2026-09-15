# Learn: Duolingo-style mechanics

This documents the Duolingo-inspired learning system in Launch Financial — what
was **built**, and what was intentionally **deferred** (with reasoning and a
sketch of how to add it later).

The source blueprint asked us to model Duolingo's product mechanics. We
implemented the parts that make the *learning* effective and fit an educational
finance simulator. We deliberately left out the parts that exist to monetize or
that don't fit a no-IAP, single-cohort teaching app.

---

## What was built

| Mechanic | Where |
|---|---|
| **Half-Life spaced repetition (HLM)** — `p = 2^(-Δt/h)`, per-item half-life, overdue at `p < 0.7` | `backend/src/services/spacedRepetition.ts` |
| **Mistake recycler** — wrong items requeue until the session's failed set is empty | `frontend/src/pages/LessonPage.tsx` (session queue) |
| **Interleaved sessions** — ~15 items, 60% new / 20% reinforcement / 20% review, adapted to the available pool | `backend/src/services/learnSession.ts` |
| **Crown levels** — nodes level 0→5, each level lengthens/hardens the session | `LessonProgress.crownLevel`, `completeLesson` |
| **Streak freezes** — earned at milestones, auto-consumed to protect the streak on a missed day | `User.streakFreezes` + `validateStreak` |
| **XP speed & accuracy bonuses** — base + up to +5 accuracy + up to +5 speed | `computeXp` in `learning.ts` |
| **Spaced-review session** — a curriculum-wide "due items" practice | `getReviewSession` / `ReviewPage.tsx` |
| **Snake-path UI** — crown pips, freeze strip, review CTA, feedback animations | `LearnPage.tsx`, `styles.css` |

### Data model notes
- `ItemMemory` (per `userId` + `itemId`) holds the HLM state: `halfLifeHours`,
  `lastReviewed`, seen/correct/wrong counts, and a correct-streak.
- Grading is authoritative on the server, keyed by stable question `itemId`
  (e.g. `gs-1-q1`). The client never decides the score; it only reports whether
  each item was correct on the **first** try (the recycler guarantees every
  item is eventually answered right).
- The streak "daily validation loop" is evaluated lazily on read
  (`validateStreak` inside `getStats`) since there is no cron. A missed day is
  covered by one freeze per missed day, else the streak resets.

---

## What was deferred (and why)

These are **not** built. Each entry explains the reasoning and how it could be
added later without disrupting the current design.

### 1. Hearts / health energy (gating mistakes)
- **Why deferred:** Hearts gate learning behind a wait timer or payment and
  punish wrong answers. On a financial-literacy tool the goal is to *encourage*
  practice, not ration it. This actively works against the product.
- **If added later:** Add `hearts` + `heartsUpdatedAt` to `User`; decrement in
  `completeLesson`/review on a first-try miss; regenerate on a timer or via a
  practice session. Gate `getLessonSession` when `hearts === 0`. Keep it
  **off by default** and consider limiting it to an optional "challenge mode".

### 2. Gems / virtual currency + microtransactions + streak repair purchase
- **Why deferred:** There is no in-app-purchase system, and a finance *sim* with
  fake trading money would blur badly with a second fake "gems" wallet. Building
  an economy (earn/spend/sink, purchase flows) is a large feature with no home
  here. "Buy back your streak" is a monetization hook, not a learning feature.
- **If added later:** Add a `gems` balance to `User` and a `LedgerEntry`-style
  table for earn/spend. Award gems at milestones; let them buy streak freezes or
  crown "test-outs". The streak-freeze mechanic already models the "sink" side,
  so freezes would just become purchasable in addition to milestone-earned.

### 3. Leagues / leaderboards (30-user brackets, promotion/demotion)
- **Why deferred:** Competitive leagues need many concurrent active users,
  weekly matchmaking into brackets, a weekly reset job, and anti-cheat. The app
  doesn't have the user volume to make brackets meaningful, and the infra
  (scheduled resets, tie-breaking, division state) is disproportionate.
- **If added later:** Add `League`, `LeagueMember` (with weekly XP), and a
  weekly cron/serverless job to seed brackets of ~30, promote the top tier and
  demote the bottom. Weekly XP is already trackable from XP awards; you'd snapshot
  it per league period. Best revisited once there's a real active-user base.

### 4. Smart notification engine (push at ~23.5h, adaptive/reverse-psychology copy)
- **Why deferred:** Requires push infrastructure (FCM/APNs), device-token
  storage, notification permissions, and a scheduler — a whole subsystem. The
  blueprint's "we'll stop sending them" reverse-psychology copy is a manipulative
  pattern we're choosing not to ship for trust/reputation reasons.
- **If added later:** Store device tokens per user; schedule a reminder for
  ~24h after the last active session (using `lastLessonDay`/activity time). Keep
  copy honest and easy to turn off. This is purely additive — it reads existing
  streak/activity state and needs no schema changes to the learning core.

### 5. Single-tap word-block exercises (sentence builder)
- **Why deferred:** That exercise type is language-learning specific (assemble a
  translated sentence from word tiles). It has no natural analog for finance
  concepts, which are tested well by multiple-choice and true/false.
- **If added later:** The `QuizQuestion` schema would need a new `type` (e.g.
  `"order_the_steps"` or `"match_pairs"`) plus a renderer in the quiz UI and a
  grading branch. The session builder and HLM engine are type-agnostic and would
  need no changes — they operate on `itemId`, not question shape.

---

## Design principles we kept

- **Server-authoritative grading.** The client reports first-try correctness;
  the backend re-grades by `itemId`. Answer keys are only fetched for instant UI
  feedback, never trusted for scoring.
- **Adapt to real content.** The nominal 15-item session shrinks to the pool a
  lesson can actually support, so short lessons aren't padded with filler.
- **Learning over engagement-baiting.** We shipped spacing, interleaving, and the
  mistake recycler (the mechanics that make retention work) and skipped the
  mechanics whose primary purpose is monetization or pressure.
