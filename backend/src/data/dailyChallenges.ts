/**
 * Daily Money Challenge — a single "would you rather" style money decision per
 * day, with the reasoning revealed after you choose. It's the equivalent of
 * Duolingo's daily habit hook: small, self-contained, and different each day.
 *
 * The challenge is chosen deterministically from the pool by calendar day, so
 * everyone sees the same one on a given day and it rotates predictably.
 */

export interface DailyChallenge {
  id: string;
  question: string;
  options: { label: string; result: string }[];
  /** Index of the "better" answer for feedback framing (not strictly graded). */
  best: number;
  takeaway: string;
}

export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: "dc-lump-vs-drip",
    question: "Would you rather receive…",
    options: [
      { label: "$10,000 today", result: "Invested at 8%/yr, that's ~$100,600 in 30 years." },
      {
        label: "$100 every month for 15 years",
        result: "That's $18,000 total; invested monthly at 8% it's ~$34,600 in 15 years.",
      },
    ],
    best: 0,
    takeaway:
      "A lump sum invested early has more time to compound. Time in the market is the quiet superpower.",
  },
  {
    id: "dc-debt-vs-invest",
    question: "You have $1,000 spare and a credit card at 22% interest. Better move?",
    options: [
      { label: "Pay down the credit card", result: "You 'earn' a guaranteed 22% by avoiding that interest." },
      { label: "Invest it in stocks", result: "Hoped-for ~8% average, but not guaranteed — and the 22% keeps piling up." },
    ],
    best: 0,
    takeaway: "Clearing high-interest debt is like a guaranteed return few investments can beat.",
  },
  {
    id: "dc-start-early",
    question: "Two friends invest $200/mo at 8%. Who ends up richer at 65?",
    options: [
      { label: "Starts at 25, stops at 35 (10 yrs)", result: "~$300k+ — a decade of early compounding wins." },
      { label: "Starts at 35, invests until 65 (30 yrs)", result: "~$300k too — despite investing 3x as long." },
    ],
    best: 0,
    takeaway: "Starting earlier can beat investing longer. The first dollars compound the most.",
  },
  {
    id: "dc-emergency-first",
    question: "No emergency fund yet. $2,000 windfall — where first?",
    options: [
      { label: "Start an emergency fund", result: "A cash buffer stops the next surprise from becoming debt." },
      { label: "Put it all in stocks", result: "If your car breaks next month, you may have to sell at a bad time." },
    ],
    best: 0,
    takeaway: "A safety net comes before growth — it protects the plan from life's surprises.",
  },
  {
    id: "dc-fees",
    question: "Two identical funds. One charges 0.05%/yr, one charges 1%/yr. Over 30 years?",
    options: [
      { label: "The gap is tiny, ignore it", result: "Not so — fees compound against you just like returns compound for you." },
      { label: "The cheaper fund keeps far more", result: "On $100k over 30 years, ~1% can cost tens of thousands." },
    ],
    best: 1,
    takeaway: "Small fees compound into big differences. Favor low-cost funds when they're comparable.",
  },
  {
    id: "dc-timing",
    question: "The market just dropped 10%. Best long-term reaction?",
    options: [
      { label: "Sell to avoid more losses", result: "Selling low locks in the loss and forces you to time the re-entry." },
      { label: "Keep following your plan", result: "Diversified markets have historically recovered given time." },
    ],
    best: 1,
    takeaway: "Reacting to dips usually hurts. A plan you can stick to beats reacting to headlines.",
  },
  {
    id: "dc-diversify",
    question: "Which is less risky for long-term money?",
    options: [
      { label: "One exciting company you love", result: "One bad quarter for that company can sink your whole stake." },
      { label: "A broad index of hundreds of companies", result: "No single company can sink you — risk is spread out." },
    ],
    best: 1,
    takeaway: "Diversification cuts the risk of any single holding without giving up market growth.",
  },
];

/** Pick the challenge for a given calendar day (YYYY-MM-DD), rotating steadily. */
export function challengeForDay(dayString: string): DailyChallenge {
  // Sum char codes for a stable, spread-out index across days.
  let hash = 0;
  for (let i = 0; i < dayString.length; i++) hash = (hash * 31 + dayString.charCodeAt(i)) >>> 0;
  return DAILY_CHALLENGES[hash % DAILY_CHALLENGES.length];
}
