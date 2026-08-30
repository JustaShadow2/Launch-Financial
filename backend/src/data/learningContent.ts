/**
 * Learning curriculum for the investing / financial-literacy academy.
 *
 * This is the single source of truth for all course content. It's static data
 * (not stored in the DB) — only *progress* is persisted per user. The shape is
 * intentionally simple so lessons are easy to author and extend.
 *
 * Structure: Course (broad topic) -> Lesson (one sitting, ~1 per day) ->
 *   slides (teaching) + questions (quiz to complete the lesson).
 */

export type QuestionType = "multiple_choice" | "true_false";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  /** Index into options of the correct answer. */
  answer: number;
  /** Shown after answering, right or wrong. */
  explanation: string;
}

export interface Slide {
  title: string;
  /** Short teaching paragraphs. Kept concise, Duolingo-style. */
  body: string[];
  /** Optional highlighted takeaway. */
  keyTakeaway?: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  /** Estimated minutes. */
  minutes: number;
  xp: number;
  slides: Slide[];
  questions: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  /** Difficulty tier, used for ordering and display. */
  level: "Beginner" | "Intermediate" | "Advanced";
  /** Emoji-ish icon marker rendered by the UI. */
  icon: string;
  /** Accent color for the course card / path. */
  color: string;
  lessons: Lesson[];
}

export const COURSES: Course[] = [
  // ────────────────────────────────────────────────────────────────────────
  // 1. GETTING STARTED
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "getting-started",
    title: "Getting Started",
    description: "The absolute basics: what investing is, what stocks are, and how it all works.",
    level: "Beginner",
    icon: "🌱",
    color: "#32d296",
    lessons: [
      {
        id: "gs-1",
        title: "What is investing?",
        subtitle: "Putting money to work",
        minutes: 4,
        xp: 20,
        slides: [
          {
            title: "Saving vs. investing",
            body: [
              "Saving means setting money aside, usually in cash. It's safe, but over time inflation slowly reduces what that cash can buy.",
              "Investing means using money to buy assets that can grow in value or pay you income over time — like stocks, bonds, or funds.",
            ],
            keyTakeaway: "Investing aims to grow your money faster than inflation erodes it.",
          },
          {
            title: "Why people invest",
            body: [
              "The goal is to build wealth over the long term — for retirement, a home, or financial freedom.",
              "Historically, diversified stock investments have grown meaningfully over decades, though they rise and fall along the way.",
            ],
          },
          {
            title: "Risk and reward",
            body: [
              "Higher potential returns usually come with higher risk — the chance your investment loses value.",
              "A key skill in investing is matching the risk you take to your goals and how long you plan to invest.",
            ],
            keyTakeaway: "Risk and reward travel together. There's no return without some risk.",
          },
        ],
        questions: [
          {
            id: "gs-1-q1",
            type: "multiple_choice",
            prompt: "What is the main difference between saving and investing?",
            options: [
              "Saving grows faster than investing",
              "Investing puts money into assets that can grow, while saving keeps it as cash",
              "There is no difference",
              "Saving is only for wealthy people",
            ],
            answer: 1,
            explanation:
              "Saving keeps money as cash; investing buys assets that can grow in value or pay income.",
          },
          {
            id: "gs-1-q2",
            type: "true_false",
            prompt: "Higher potential returns generally come with higher risk.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Risk and reward are linked — chasing higher returns means accepting more risk.",
          },
          {
            id: "gs-1-q3",
            type: "multiple_choice",
            prompt: "Why does holding only cash carry a hidden risk?",
            options: [
              "Cash can be hacked",
              "Inflation erodes cash's buying power over time",
              "Banks always lose money",
              "Cash isn't real money",
            ],
            answer: 1,
            explanation: "Inflation means the same amount of cash buys less over time.",
          },
        ],
      },
      {
        id: "gs-2",
        title: "What is a stock?",
        subtitle: "Owning a slice of a company",
        minutes: 4,
        xp: 20,
        slides: [
          {
            title: "A share of ownership",
            body: [
              "A stock (or share) is a small piece of ownership in a company.",
              "If a company issues 1,000,000 shares and you own 100, you own a tiny fraction of that business.",
            ],
            keyTakeaway: "Buying a stock makes you a part-owner of a real company.",
          },
          {
            title: "How you can make money",
            body: [
              "Price appreciation: the share price rises and you can sell for more than you paid.",
              "Dividends: some companies pay out part of their profits to shareholders regularly.",
            ],
          },
          {
            title: "Why prices move",
            body: [
              "Share prices change constantly based on supply and demand — how much buyers will pay and sellers will accept.",
              "Expectations about a company's future profits, the economy, and news all push prices up and down.",
            ],
          },
        ],
        questions: [
          {
            id: "gs-2-q1",
            type: "multiple_choice",
            prompt: "What does owning a stock represent?",
            options: [
              "A loan to the government",
              "A small ownership stake in a company",
              "A guarantee of profit",
              "A type of savings account",
            ],
            answer: 1,
            explanation: "A stock is a share of ownership in a company.",
          },
          {
            id: "gs-2-q2",
            type: "multiple_choice",
            prompt: "Which of these is a way stocks can make you money?",
            options: ["Dividends", "Overdraft fees", "Interest on a loan you took", "Monthly account fees"],
            answer: 0,
            explanation: "Dividends are payments some companies make to shareholders from profits.",
          },
          {
            id: "gs-2-q3",
            type: "true_false",
            prompt: "A stock's price is fixed and set by the company.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Prices move continuously based on supply and demand in the market.",
          },
        ],
      },
      {
        id: "gs-3",
        title: "Buying and selling",
        subtitle: "How trades actually happen",
        minutes: 5,
        xp: 25,
        slides: [
          {
            title: "The marketplace",
            body: [
              "Stocks trade on exchanges — organized marketplaces that match buyers and sellers.",
              "When you place an order through a broker (like this app), it's routed to the market to be filled.",
            ],
          },
          {
            title: "Market vs. limit orders",
            body: [
              "A market order buys or sells right now at the best available price.",
              "A limit order only executes at a price you set or better — you control the price but it might not fill.",
            ],
            keyTakeaway: "Market order = speed. Limit order = price control.",
          },
          {
            title: "The bid, ask, and spread",
            body: [
              "The bid is the highest price buyers will pay; the ask is the lowest price sellers will accept.",
              "The gap between them is the spread. Popular stocks have tiny spreads; obscure ones can be wide.",
            ],
          },
        ],
        questions: [
          {
            id: "gs-3-q1",
            type: "multiple_choice",
            prompt: "A market order is best described as:",
            options: [
              "An order that fills at a specific price you choose",
              "An order that executes immediately at the best available price",
              "An order that never expires",
              "An order only banks can place",
            ],
            answer: 1,
            explanation: "Market orders prioritize speed — they fill now at the current best price.",
          },
          {
            id: "gs-3-q2",
            type: "multiple_choice",
            prompt: "What is the 'spread'?",
            options: [
              "A company's yearly profit",
              "The difference between the bid and ask prices",
              "A type of dividend",
              "The fee your bank charges",
            ],
            answer: 1,
            explanation: "The spread is the gap between the highest bid and the lowest ask.",
          },
          {
            id: "gs-3-q3",
            type: "true_false",
            prompt: "A limit order guarantees your trade will execute.",
            options: ["True", "False"],
            answer: 1,
            explanation: "A limit order only fills if the market reaches your price — it may not execute.",
          },
        ],
      },
      {
        id: "gs-4",
        title: "Types of accounts",
        subtitle: "Where your investments live",
        minutes: 5,
        xp: 25,
        slides: [
          {
            title: "Why account type matters",
            body: [
              "The account you hold investments in affects how you're taxed — which can hugely impact long-term returns.",
              "Different accounts have different rules, contribution limits, and purposes.",
            ],
          },
          {
            title: "Registered vs. non-registered",
            body: [
              "Registered accounts (like a TFSA or RRSP) offer tax advantages but have contribution limits and rules.",
              "A personal (non-registered) account has no limits, but gains and dividends are generally taxable.",
            ],
            keyTakeaway: "Tax-advantaged accounts can help your money compound faster.",
          },
          {
            title: "Common account types",
            body: [
              "TFSA: growth and withdrawals are tax-free, within annual contribution limits.",
              "RRSP: contributions can reduce taxable income now; withdrawals are taxed later, ideally in retirement.",
              "Personal: flexible, no limits, but taxable.",
            ],
          },
        ],
        questions: [
          {
            id: "gs-4-q1",
            type: "multiple_choice",
            prompt: "What's a key benefit of a TFSA?",
            options: [
              "Unlimited contributions",
              "Growth and withdrawals are tax-free within limits",
              "It guarantees profits",
              "It has no rules at all",
            ],
            answer: 1,
            explanation: "A TFSA lets investments grow and be withdrawn tax-free, within contribution limits.",
          },
          {
            id: "gs-4-q2",
            type: "true_false",
            prompt: "A personal (non-registered) account has contribution limits.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Personal accounts have no contribution limits, but they are taxable.",
          },
          {
            id: "gs-4-q3",
            type: "multiple_choice",
            prompt: "An RRSP contribution generally:",
            options: [
              "Increases your taxes today",
              "Can reduce your taxable income now, with tax paid on withdrawal later",
              "Is always tax-free forever",
              "Can never be withdrawn",
            ],
            answer: 1,
            explanation:
              "RRSP contributions can lower taxable income now; withdrawals are taxed later.",
          },
        ],
      },
      {
        id: "gs-5",
        title: "Your first trade",
        subtitle: "Putting it together",
        minutes: 4,
        xp: 30,
        slides: [
          {
            title: "A simple first step",
            body: [
              "Beginners often start with broad, diversified funds rather than picking single stocks.",
              "You can also start small — many platforms allow fractional shares so you can invest a few dollars.",
            ],
          },
          {
            title: "Think long term",
            body: [
              "Trying to time the market — buying low and selling high on cue — is extremely hard, even for pros.",
              "A common approach is investing regularly over time regardless of price, which smooths out the ups and downs.",
            ],
            keyTakeaway: "Time in the market usually beats timing the market.",
          },
          {
            title: "Practice here, risk-free",
            body: [
              "This app uses simulated money, so you can practice buying and selling with zero real-world risk.",
              "Try placing a small buy order in the Market tab after this lesson to see how it works.",
            ],
          },
        ],
        questions: [
          {
            id: "gs-5-q1",
            type: "multiple_choice",
            prompt: "Why do many beginners start with diversified funds?",
            options: [
              "They guarantee gains",
              "They spread risk across many companies instead of betting on one",
              "They're free",
              "They can't lose value",
            ],
            answer: 1,
            explanation: "Diversified funds spread risk across many holdings, reducing single-stock risk.",
          },
          {
            id: "gs-5-q2",
            type: "true_false",
            prompt: "Consistently timing the market perfectly is easy for most investors.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Market timing is notoriously difficult, even for professionals.",
          },
          {
            id: "gs-5-q3",
            type: "multiple_choice",
            prompt: "What does 'fractional shares' let you do?",
            options: [
              "Buy a portion of a share with a small amount of money",
              "Borrow shares for free",
              "Avoid all risk",
              "Get guaranteed dividends",
            ],
            answer: 0,
            explanation: "Fractional shares let you invest small amounts by buying part of a share.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 2. FINANCIAL LITERACY FOUNDATIONS
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "financial-literacy",
    title: "Financial Literacy",
    description: "Core money skills: budgeting, compound interest, debt, and emergency funds.",
    level: "Beginner",
    icon: "💡",
    color: "#7fb5ff",
    lessons: [
      {
        id: "fl-1",
        title: "The power of compounding",
        subtitle: "How money grows on itself",
        minutes: 5,
        xp: 25,
        slides: [
          {
            title: "Interest on interest",
            body: [
              "Compounding is when your returns start earning returns of their own.",
              "Over long periods, this snowball effect becomes the single most powerful force in investing.",
            ],
            keyTakeaway: "The earlier you start, the more time compounding has to work.",
          },
          {
            title: "A quick example",
            body: [
              "$1,000 growing at 8% a year becomes about $2,159 in 10 years and about $10,063 in 30 years.",
              "Notice the growth accelerates — most of the gain happens in the later years.",
            ],
          },
          {
            title: "The rule of 72",
            body: [
              "Divide 72 by your annual return to estimate how many years it takes to double your money.",
              "At 8%, that's roughly 72 / 8 = 9 years to double.",
            ],
          },
        ],
        questions: [
          {
            id: "fl-1-q1",
            type: "multiple_choice",
            prompt: "Compounding means:",
            options: [
              "Spending your returns each year",
              "Your returns earn returns of their own over time",
              "Paying more taxes",
              "Withdrawing money early",
            ],
            answer: 1,
            explanation: "Compounding is returns generating further returns — a snowball effect.",
          },
          {
            id: "fl-1-q2",
            type: "multiple_choice",
            prompt: "Using the rule of 72, about how long to double money at 6% a year?",
            options: ["6 years", "12 years", "24 years", "3 years"],
            answer: 1,
            explanation: "72 / 6 = 12 years.",
          },
          {
            id: "fl-1-q3",
            type: "true_false",
            prompt: "Starting to invest earlier gives compounding more time to work.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Time is compounding's best friend — earlier is better.",
          },
        ],
      },
      {
        id: "fl-2",
        title: "Budgeting basics",
        subtitle: "Spend less than you earn",
        minutes: 4,
        xp: 20,
        slides: [
          {
            title: "The foundation",
            body: [
              "You can't invest money you don't have. A budget helps you consistently free up money to invest.",
              "The simplest rule: spend less than you earn, and put the difference to work.",
            ],
          },
          {
            title: "The 50/30/20 guideline",
            body: [
              "A popular starting framework: 50% of after-tax income to needs, 30% to wants, 20% to savings and investing.",
              "It's a guideline, not a law — adjust it to your situation.",
            ],
            keyTakeaway: "Automating the 20% makes investing effortless and consistent.",
          },
        ],
        questions: [
          {
            id: "fl-2-q1",
            type: "multiple_choice",
            prompt: "In the 50/30/20 guideline, what does the 20% go to?",
            options: ["Wants", "Needs", "Savings and investing", "Taxes"],
            answer: 2,
            explanation: "The 20% is earmarked for savings and investing.",
          },
          {
            id: "fl-2-q2",
            type: "true_false",
            prompt: "You should invest money you need for essential bills next week.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Only invest money you won't need soon — essentials come first.",
          },
        ],
      },
      {
        id: "fl-3",
        title: "Good debt vs. bad debt",
        subtitle: "Not all borrowing is equal",
        minutes: 4,
        xp: 20,
        slides: [
          {
            title: "The cost of debt",
            body: [
              "High-interest debt (like credit cards) can grow faster than most investments return.",
              "Paying off a 20% credit card is like earning a guaranteed 20% return — often the best 'investment' available.",
            ],
            keyTakeaway: "Clear high-interest debt before investing aggressively.",
          },
          {
            title: "When debt can help",
            body: [
              "Lower-interest debt tied to an appreciating asset (like a mortgage) is often considered more manageable.",
              "The key question: is the interest rate higher than what you could reasonably earn investing?",
            ],
          },
        ],
        questions: [
          {
            id: "fl-3-q1",
            type: "multiple_choice",
            prompt: "Why is paying off a 20% credit card often better than investing?",
            options: [
              "It's a guaranteed 'return' equal to the interest avoided",
              "Credit cards give free money",
              "Investing is illegal with debt",
              "It isn't better",
            ],
            answer: 0,
            explanation: "Eliminating 20% interest is like locking in a guaranteed 20% return.",
          },
          {
            id: "fl-3-q2",
            type: "true_false",
            prompt: "All debt is equally harmful.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Interest rate and purpose matter — low-rate debt can be manageable.",
          },
        ],
      },
      {
        id: "fl-4",
        title: "Emergency funds",
        subtitle: "Your financial safety net",
        minutes: 3,
        xp: 20,
        slides: [
          {
            title: "Why you need one",
            body: [
              "An emergency fund is easily accessible cash for surprises — job loss, car repairs, medical bills.",
              "It stops you from being forced to sell investments at a bad time or take on high-interest debt.",
            ],
            keyTakeaway: "A common target is 3–6 months of essential expenses in cash.",
          },
        ],
        questions: [
          {
            id: "fl-4-q1",
            type: "multiple_choice",
            prompt: "A common emergency fund target is:",
            options: [
              "3–6 months of essential expenses",
              "10 years of income",
              "One day's pay",
              "You don't need one",
            ],
            answer: 0,
            explanation: "3–6 months of essential expenses is a widely used guideline.",
          },
          {
            id: "fl-4-q2",
            type: "true_false",
            prompt: "An emergency fund should be hard to access and fully invested in stocks.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Emergency funds should be safe and easily accessible, not tied up in volatile assets.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 3. BUILDING A PORTFOLIO
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "building-portfolio",
    title: "Building a Portfolio",
    description: "Diversification, ETFs, asset allocation, and managing risk over time.",
    level: "Intermediate",
    icon: "📊",
    color: "#c792ea",
    lessons: [
      {
        id: "bp-1",
        title: "Diversification",
        subtitle: "Don't put all your eggs in one basket",
        minutes: 5,
        xp: 30,
        slides: [
          {
            title: "Spreading risk",
            body: [
              "Diversification means holding a mix of investments so no single one can sink your whole portfolio.",
              "If one company or sector struggles, others may hold up or grow, smoothing your overall returns.",
            ],
            keyTakeaway: "Diversification reduces risk without necessarily reducing expected return.",
          },
          {
            title: "Ways to diversify",
            body: [
              "Across companies, across industries, across asset types (stocks, bonds), and across countries.",
              "A single broad index fund can instantly give you exposure to hundreds or thousands of companies.",
            ],
          },
        ],
        questions: [
          {
            id: "bp-1-q1",
            type: "multiple_choice",
            prompt: "Diversification primarily helps by:",
            options: [
              "Guaranteeing gains",
              "Reducing the impact of any single investment doing poorly",
              "Eliminating all risk",
              "Increasing fees",
            ],
            answer: 1,
            explanation: "It reduces the damage any single holding can do to your portfolio.",
          },
          {
            id: "bp-1-q2",
            type: "true_false",
            prompt: "Owning a single broad index fund can provide instant diversification.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Broad index funds hold many companies at once, diversifying instantly.",
          },
        ],
      },
      {
        id: "bp-2",
        title: "What is an ETF?",
        subtitle: "A basket you can trade",
        minutes: 5,
        xp: 30,
        slides: [
          {
            title: "Exchange-traded funds",
            body: [
              "An ETF is a fund that holds many assets but trades on an exchange like a single stock.",
              "Buying one share of a broad ETF can give you a slice of an entire market.",
            ],
            keyTakeaway: "ETFs combine diversification with the convenience of a single trade.",
          },
          {
            title: "Costs matter",
            body: [
              "ETFs charge an expense ratio — a small annual percentage of your investment.",
              "Low-cost index ETFs often charge a fraction of a percent, which keeps more returns in your pocket.",
            ],
          },
        ],
        questions: [
          {
            id: "bp-2-q1",
            type: "multiple_choice",
            prompt: "An ETF is:",
            options: [
              "A single company's stock",
              "A fund holding many assets that trades like a stock",
              "A type of bank account",
              "A government bond",
            ],
            answer: 1,
            explanation: "ETFs hold baskets of assets but trade on exchanges like stocks.",
          },
          {
            id: "bp-2-q2",
            type: "multiple_choice",
            prompt: "The expense ratio is:",
            options: [
              "A one-time purchase fee",
              "A small annual percentage cost of holding the fund",
              "A guaranteed return",
              "The dividend yield",
            ],
            answer: 1,
            explanation: "It's the annual cost of owning the fund, charged as a percentage.",
          },
        ],
      },
      {
        id: "bp-3",
        title: "Asset allocation",
        subtitle: "Your mix of stocks and bonds",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "The big decision",
            body: [
              "Asset allocation is how you split your money among asset types like stocks and bonds.",
              "It's one of the biggest drivers of your portfolio's risk and return over time.",
            ],
          },
          {
            title: "Matching your timeline",
            body: [
              "Longer time horizons can generally handle more stocks, which are volatile but higher-growth.",
              "As goals get closer, shifting toward bonds and cash can protect what you've built.",
            ],
            keyTakeaway: "Your time horizon and risk tolerance shape your ideal allocation.",
          },
        ],
        questions: [
          {
            id: "bp-3-q1",
            type: "multiple_choice",
            prompt: "Asset allocation refers to:",
            options: [
              "Which broker you use",
              "How you split money among asset types like stocks and bonds",
              "The time of day you trade",
              "Your account password",
            ],
            answer: 1,
            explanation: "It's the mix of asset types in your portfolio.",
          },
          {
            id: "bp-3-q2",
            type: "true_false",
            prompt: "A longer time horizon can generally support a higher allocation to stocks.",
            options: ["True", "False"],
            answer: 0,
            explanation: "More time means more ability to ride out stock volatility.",
          },
        ],
      },
      {
        id: "bp-4",
        title: "Dollar-cost averaging",
        subtitle: "Investing on autopilot",
        minutes: 4,
        xp: 30,
        slides: [
          {
            title: "Invest a fixed amount regularly",
            body: [
              "Dollar-cost averaging (DCA) means investing a set amount on a schedule, regardless of price.",
              "You buy more shares when prices are low and fewer when they're high — automatically.",
            ],
            keyTakeaway: "DCA removes emotion and the pressure to time the market.",
          },
        ],
        questions: [
          {
            id: "bp-4-q1",
            type: "multiple_choice",
            prompt: "Dollar-cost averaging means:",
            options: [
              "Investing everything at once",
              "Investing a fixed amount on a regular schedule",
              "Only buying when prices fall",
              "Selling every month",
            ],
            answer: 1,
            explanation: "DCA invests a fixed amount regularly, regardless of price.",
          },
          {
            id: "bp-4-q2",
            type: "true_false",
            prompt: "DCA helps reduce the emotional pressure of timing the market.",
            options: ["True", "False"],
            answer: 0,
            explanation: "By investing on a schedule, DCA takes timing decisions off your plate.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 4. UNDERSTANDING RISK & MARKETS
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "risk-and-markets",
    title: "Risk & Markets",
    description: "Volatility, bull and bear markets, and the psychology of investing.",
    level: "Intermediate",
    icon: "🎢",
    color: "#ffcb6b",
    lessons: [
      {
        id: "rm-1",
        title: "Volatility explained",
        subtitle: "Why prices swing",
        minutes: 4,
        xp: 30,
        slides: [
          {
            title: "Ups and downs are normal",
            body: [
              "Volatility is how much and how quickly prices move up and down.",
              "Higher volatility means bigger swings — more potential reward, but a bumpier ride.",
            ],
            keyTakeaway: "Volatility is the price of admission for long-term growth.",
          },
        ],
        questions: [
          {
            id: "rm-1-q1",
            type: "multiple_choice",
            prompt: "Volatility measures:",
            options: [
              "A company's profit",
              "How much prices move up and down",
              "The dividend amount",
              "Your account balance",
            ],
            answer: 1,
            explanation: "Volatility describes the size and speed of price movements.",
          },
          {
            id: "rm-1-q2",
            type: "true_false",
            prompt: "Price drops always mean you should sell immediately.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Reacting emotionally to every dip often hurts long-term returns.",
          },
        ],
      },
      {
        id: "rm-2",
        title: "Bull and bear markets",
        subtitle: "The market's moods",
        minutes: 4,
        xp: 30,
        slides: [
          {
            title: "Two directions",
            body: [
              "A bull market is a sustained period of rising prices and optimism.",
              "A bear market is a prolonged decline, often defined as a drop of 20% or more from recent highs.",
            ],
            keyTakeaway: "Both are normal parts of long market cycles.",
          },
        ],
        questions: [
          {
            id: "rm-2-q1",
            type: "multiple_choice",
            prompt: "A bear market is generally:",
            options: [
              "A period of rising prices",
              "A prolonged decline of about 20% or more",
              "A single bad day",
              "A type of ETF",
            ],
            answer: 1,
            explanation: "A bear market is a sustained decline, often 20%+ from highs.",
          },
          {
            id: "rm-2-q2",
            type: "true_false",
            prompt: "A bull market describes sustained rising prices.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Bull markets are extended periods of rising prices and optimism.",
          },
        ],
      },
      {
        id: "rm-3",
        title: "Investor psychology",
        subtitle: "Your own worst enemy",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Fear and greed",
            body: [
              "Emotions drive many investing mistakes: panic-selling in crashes, chasing hot trends at the top.",
              "The crowd is often most excited near peaks and most fearful near bottoms.",
            ],
            keyTakeaway: "A written plan helps you act rationally when emotions run high.",
          },
          {
            title: "Common biases",
            body: [
              "Loss aversion: losses feel worse than equivalent gains feel good.",
              "Herd behavior: doing what everyone else is doing, even when it's unwise.",
            ],
          },
        ],
        questions: [
          {
            id: "rm-3-q1",
            type: "multiple_choice",
            prompt: "Loss aversion means:",
            options: [
              "Losses feel worse than equivalent gains feel good",
              "You never lose money",
              "You love taking losses",
              "Gains and losses feel identical",
            ],
            answer: 0,
            explanation: "People typically feel the pain of a loss more than the joy of an equal gain.",
          },
          {
            id: "rm-3-q2",
            type: "true_false",
            prompt: "Having a written plan can help you avoid emotional decisions.",
            options: ["True", "False"],
            answer: 0,
            explanation: "A plan set in calm times guides you through volatile ones.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 5. OPTIONS TRADING FROM SCRATCH
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "options-from-scratch",
    title: "Options From Scratch",
    description: "Learn options trading from zero: calls, puts, and how to think about them.",
    level: "Advanced",
    icon: "⚙️",
    color: "#ff6b6b",
    lessons: [
      {
        id: "op-1",
        title: "What is an option?",
        subtitle: "A contract, not a share",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "The right, not the obligation",
            body: [
              "An option is a contract giving you the right — but not the obligation — to buy or sell an asset at a set price by a set date.",
              "Unlike a stock, you don't own the company; you own a contract tied to its price.",
            ],
            keyTakeaway: "Options derive their value from an underlying asset — they're 'derivatives'.",
          },
          {
            title: "Key terms",
            body: [
              "Strike price: the agreed price to buy or sell at.",
              "Expiration: the date the contract ends.",
              "Premium: the price you pay to buy the option.",
            ],
          },
          {
            title: "One contract = 100 shares",
            body: [
              "In most markets, a single option contract controls 100 shares of the underlying stock.",
              "This leverage means small price moves can cause large percentage swings in the option's value.",
            ],
          },
        ],
        questions: [
          {
            id: "op-1-q1",
            type: "multiple_choice",
            prompt: "An option gives you:",
            options: [
              "Ownership of the company",
              "The right, but not obligation, to buy or sell at a set price by a date",
              "A guaranteed profit",
              "A dividend",
            ],
            answer: 1,
            explanation: "Options are contracts granting a right, not an obligation.",
          },
          {
            id: "op-1-q2",
            type: "multiple_choice",
            prompt: "The 'premium' is:",
            options: [
              "The strike price",
              "The price you pay to buy the option",
              "The dividend",
              "The expiration date",
            ],
            answer: 1,
            explanation: "The premium is the cost of purchasing the option contract.",
          },
          {
            id: "op-1-q3",
            type: "true_false",
            prompt: "One standard option contract typically controls 100 shares.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Standard equity option contracts cover 100 shares each.",
          },
        ],
      },
      {
        id: "op-2",
        title: "Calls and puts",
        subtitle: "The two building blocks",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "Call options",
            body: [
              "A call gives you the right to BUY the underlying at the strike price.",
              "Buyers of calls generally profit when the stock rises above the strike (plus the premium paid).",
            ],
            keyTakeaway: "Calls are a bullish bet — you want the price to go up.",
          },
          {
            title: "Put options",
            body: [
              "A put gives you the right to SELL the underlying at the strike price.",
              "Buyers of puts generally profit when the stock falls below the strike (minus the premium paid).",
            ],
            keyTakeaway: "Puts are a bearish bet — or insurance against a drop.",
          },
        ],
        questions: [
          {
            id: "op-2-q1",
            type: "multiple_choice",
            prompt: "A call option gives the right to:",
            options: ["Sell the underlying", "Buy the underlying", "Collect a dividend", "Vote at meetings"],
            answer: 1,
            explanation: "Calls grant the right to buy at the strike price.",
          },
          {
            id: "op-2-q2",
            type: "multiple_choice",
            prompt: "Buying a put is generally a bet that the price will:",
            options: ["Rise", "Fall", "Stay exactly flat", "Split"],
            answer: 1,
            explanation: "Put buyers profit when the underlying falls below the strike.",
          },
          {
            id: "op-2-q3",
            type: "true_false",
            prompt: "A call option is considered a bullish position.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Call buyers want the price to rise, which is bullish.",
          },
        ],
      },
      {
        id: "op-3",
        title: "Risk and the premium",
        subtitle: "What you can lose",
        minutes: 6,
        xp: 45,
        slides: [
          {
            title: "Limited loss for buyers",
            body: [
              "When you BUY an option, the most you can lose is the premium you paid.",
              "That defined risk is a key appeal — but options can expire worthless, losing 100% of the premium.",
            ],
            keyTakeaway: "Buying options: capped loss (the premium), potentially large gains.",
          },
          {
            title: "Time decay",
            body: [
              "Options lose value as expiration approaches — this is called time decay (theta).",
              "Even if you're right about direction, being too early or slow can still lose money.",
            ],
          },
          {
            title: "Selling is different",
            body: [
              "Selling (writing) options can bring income but may carry much larger — sometimes unlimited — risk.",
              "Beginners should understand buying thoroughly before ever considering selling naked options.",
            ],
            keyTakeaway: "Selling options can carry far greater risk than buying them.",
          },
        ],
        questions: [
          {
            id: "op-3-q1",
            type: "multiple_choice",
            prompt: "When you buy an option, your maximum loss is:",
            options: [
              "Unlimited",
              "The premium you paid",
              "The strike price",
              "100 shares' full value",
            ],
            answer: 1,
            explanation: "An option buyer can lose at most the premium paid.",
          },
          {
            id: "op-3-q2",
            type: "multiple_choice",
            prompt: "Time decay (theta) refers to:",
            options: [
              "Options gaining value over time",
              "Options losing value as expiration nears",
              "A type of dividend",
              "A stock split",
            ],
            answer: 1,
            explanation: "Options tend to lose value as they approach expiration.",
          },
          {
            id: "op-3-q3",
            type: "true_false",
            prompt: "Selling naked options can carry much larger risk than buying options.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Writing naked options can expose you to very large or unlimited losses.",
          },
        ],
      },
      {
        id: "op-4",
        title: "A simple options strategy",
        subtitle: "The covered call",
        minutes: 6,
        xp: 50,
        slides: [
          {
            title: "Owning shares + selling a call",
            body: [
              "A covered call means you own 100 shares and sell a call option against them.",
              "You collect the premium as income; in exchange, you cap your upside if the stock rises above the strike.",
            ],
            keyTakeaway: "Covered calls trade some upside for immediate income.",
          },
          {
            title: "The trade-offs",
            body: [
              "If the stock stays flat or rises modestly, you keep the premium and your shares.",
              "If it soars past the strike, your shares may be 'called away' — you miss gains above the strike.",
            ],
          },
        ],
        questions: [
          {
            id: "op-4-q1",
            type: "multiple_choice",
            prompt: "A covered call involves:",
            options: [
              "Owning shares and selling a call against them",
              "Buying two puts",
              "Only buying calls",
              "Selling all your shares",
            ],
            answer: 0,
            explanation: "You hold the shares and sell a call on them to collect premium.",
          },
          {
            id: "op-4-q2",
            type: "true_false",
            prompt: "A covered call caps your upside if the stock rises far above the strike.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Above the strike, gains are capped since shares can be called away.",
          },
          {
            id: "op-4-q3",
            type: "multiple_choice",
            prompt: "The main benefit of a covered call is:",
            options: [
              "Unlimited upside",
              "Collecting premium income",
              "Eliminating all risk",
              "Guaranteed share price growth",
            ],
            answer: 1,
            explanation: "The immediate premium income is the primary benefit.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 6. STOCKS DEEP DIVE
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "stocks-deep-dive",
    title: "Stocks Deep Dive",
    description: "Go beyond the basics: market cap, sectors, share classes, and every order type.",
    level: "Intermediate",
    icon: "🔍",
    color: "#4dd0e1",
    lessons: [
      {
        id: "sdd-1",
        title: "Market capitalization",
        subtitle: "How companies are sized",
        minutes: 5,
        xp: 30,
        slides: [
          {
            title: "What market cap means",
            body: [
              "Market capitalization is a company's total value in the market: share price multiplied by the number of shares outstanding.",
              "It's the standard way investors describe a company's size — not the share price alone. A $500 stock can be a smaller company than a $20 stock.",
            ],
            keyTakeaway: "Market cap = price x shares outstanding. It measures size, not 'expensiveness'.",
          },
          {
            title: "The size tiers",
            body: [
              "Large-cap: roughly $10B and above — established, more stable companies.",
              "Mid-cap: roughly $2B to $10B — often a balance of growth and stability.",
              "Small-cap: under ~$2B — more growth potential, but typically more volatile and risky.",
            ],
          },
          {
            title: "Why it matters for you",
            body: [
              "Size tends to correlate with risk and growth potential. Small-caps can grow faster but swing harder.",
              "Many diversified funds spread across all sizes, giving you balanced exposure automatically.",
            ],
          },
        ],
        questions: [
          {
            id: "sdd-1-q1",
            type: "multiple_choice",
            prompt: "Market capitalization is calculated as:",
            options: [
              "Share price minus debt",
              "Share price multiplied by shares outstanding",
              "Yearly revenue",
              "Total employees times salary",
            ],
            answer: 1,
            explanation: "Market cap is share price times the number of shares outstanding.",
          },
          {
            id: "sdd-1-q2",
            type: "true_false",
            prompt: "A higher share price always means a larger company.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Share price alone says nothing about size — you need to know shares outstanding too.",
          },
          {
            id: "sdd-1-q3",
            type: "multiple_choice",
            prompt: "Small-cap stocks are generally:",
            options: [
              "Safer than large-caps",
              "Higher growth potential but more volatile",
              "Guaranteed to outperform",
              "Only available to institutions",
            ],
            answer: 1,
            explanation: "Small-caps offer more growth potential with higher volatility and risk.",
          },
        ],
      },
      {
        id: "sdd-2",
        title: "Sectors and industries",
        subtitle: "How the market is organized",
        minutes: 5,
        xp: 30,
        slides: [
          {
            title: "Dividing up the market",
            body: [
              "Companies are grouped into sectors — broad slices of the economy like Technology, Healthcare, Financials, and Energy.",
              "Sectors are broken further into industries. 'Technology' contains software, semiconductors, hardware, and more.",
            ],
            keyTakeaway: "Sectors group companies by the kind of business they do.",
          },
          {
            title: "Cyclical vs. defensive",
            body: [
              "Cyclical sectors (like consumer discretionary and industrials) rise and fall with the economy.",
              "Defensive sectors (like utilities, consumer staples, and healthcare) tend to hold up better in downturns because people need their products regardless.",
            ],
          },
          {
            title: "Why sector awareness helps",
            body: [
              "If your holdings are all in one sector, you're less diversified than you might think — a sector-wide slump hits all of them.",
              "Spreading across sectors smooths returns, since different sectors lead at different times.",
            ],
          },
        ],
        questions: [
          {
            id: "sdd-2-q1",
            type: "multiple_choice",
            prompt: "A 'defensive' sector is one that:",
            options: [
              "Only military companies belong to",
              "Tends to hold up better during economic downturns",
              "Always beats the market",
              "Has no risk",
            ],
            answer: 1,
            explanation: "Defensive sectors (utilities, staples, healthcare) are more resilient in downturns.",
          },
          {
            id: "sdd-2-q2",
            type: "true_false",
            prompt: "Owning ten tech stocks is well diversified across sectors.",
            options: ["True", "False"],
            answer: 1,
            explanation: "They're all in one sector, so a tech slump would hit the whole group.",
          },
        ],
      },
      {
        id: "sdd-3",
        title: "Reading a stock quote",
        subtitle: "Decoding the numbers",
        minutes: 5,
        xp: 30,
        slides: [
          {
            title: "The core figures",
            body: [
              "Last price is the most recent trade. The day's change shows movement since the previous close.",
              "Volume is how many shares traded — high volume signals strong interest and easier trading.",
            ],
            keyTakeaway: "Price tells you the 'what'; volume hints at conviction behind the move.",
          },
          {
            title: "The trading range",
            body: [
              "Day range shows the low and high so far today; the 52-week range shows the past year's extremes.",
              "Comparing the current price to the 52-week range gives quick context on where a stock sits.",
            ],
          },
          {
            title: "Common valuation stats",
            body: [
              "You'll often see market cap, P/E ratio, and dividend yield next to a quote.",
              "These help you compare a company to peers — we cover how to read them in the next course.",
            ],
          },
        ],
        questions: [
          {
            id: "sdd-3-q1",
            type: "multiple_choice",
            prompt: "Trading volume tells you:",
            options: [
              "The company's profit",
              "How many shares changed hands",
              "The dividend amount",
              "The CEO's salary",
            ],
            answer: 1,
            explanation: "Volume is the number of shares traded in a period.",
          },
          {
            id: "sdd-3-q2",
            type: "multiple_choice",
            prompt: "The 52-week range shows:",
            options: [
              "The highest and lowest price over the past year",
              "The number of employees",
              "This week's dividend",
              "The number of shares",
            ],
            answer: 0,
            explanation: "It's the price low and high over the trailing 52 weeks.",
          },
        ],
      },
      {
        id: "sdd-4",
        title: "Advanced order types",
        subtitle: "Stops and beyond",
        minutes: 6,
        xp: 35,
        slides: [
          {
            title: "Stop orders",
            body: [
              "A stop (or stop-loss) order becomes a market order once the price hits a level you set.",
              "It's often used to limit losses: 'sell if it falls to $90'. Note that in fast markets it may fill below your stop.",
            ],
            keyTakeaway: "A stop turns into a market order once triggered — the fill price isn't guaranteed.",
          },
          {
            title: "Stop-limit orders",
            body: [
              "A stop-limit combines a stop trigger with a limit price, so you won't sell below a floor you choose.",
              "The trade-off: if price gaps past your limit, the order may not fill at all.",
            ],
          },
          {
            title: "Good-til-canceled vs. day orders",
            body: [
              "A day order expires at the end of the trading day if unfilled.",
              "A good-til-canceled (GTC) order stays active until it fills or you cancel it, often up to a broker limit.",
            ],
          },
        ],
        questions: [
          {
            id: "sdd-4-q1",
            type: "multiple_choice",
            prompt: "A stop-loss order is typically used to:",
            options: [
              "Guarantee a profit",
              "Trigger a sale to limit losses once a price level is hit",
              "Buy more shares automatically forever",
              "Pay dividends",
            ],
            answer: 1,
            explanation: "A stop-loss triggers a sale to help cap losses at a chosen level.",
          },
          {
            id: "sdd-4-q2",
            type: "true_false",
            prompt: "A stop-limit order guarantees your trade fills once triggered.",
            options: ["True", "False"],
            answer: 1,
            explanation: "If price gaps past the limit, a stop-limit may not fill at all.",
          },
          {
            id: "sdd-4-q3",
            type: "multiple_choice",
            prompt: "A GTC order:",
            options: [
              "Expires at day's end",
              "Stays active until filled or canceled",
              "Can only be used for crypto",
              "Is the same as a market order",
            ],
            answer: 1,
            explanation: "Good-til-canceled orders persist until they fill or you cancel them.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 7. READING COMPANIES (FUNDAMENTAL ANALYSIS)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "reading-companies",
    title: "Reading Companies",
    description: "Research like a pro: financial statements, valuation ratios, dividends, and earnings.",
    level: "Intermediate",
    icon: "📑",
    color: "#a5d6a7",
    lessons: [
      {
        id: "rc-1",
        title: "The income statement",
        subtitle: "Is the company profitable?",
        minutes: 6,
        xp: 35,
        slides: [
          {
            title: "Top line to bottom line",
            body: [
              "Revenue (the 'top line') is total sales. Subtract costs and expenses and you eventually reach net income (the 'bottom line').",
              "Growing revenue and profit over time is a healthy sign; shrinking figures deserve a closer look.",
            ],
            keyTakeaway: "Revenue is what comes in; net income is what's left after all expenses.",
          },
          {
            title: "Margins matter",
            body: [
              "Profit margin is net income divided by revenue — how much of each sales dollar becomes profit.",
              "Comparing margins to competitors shows how efficient and pricing-powerful a company is.",
            ],
          },
        ],
        questions: [
          {
            id: "rc-1-q1",
            type: "multiple_choice",
            prompt: "Net income is:",
            options: [
              "Total sales before costs",
              "What's left after all expenses are subtracted from revenue",
              "The dividend",
              "The share price",
            ],
            answer: 1,
            explanation: "Net income (the bottom line) is profit after all expenses.",
          },
          {
            id: "rc-1-q2",
            type: "multiple_choice",
            prompt: "Profit margin measures:",
            options: [
              "How much of each sales dollar becomes profit",
              "The total number of shares",
              "How many stores a company has",
              "The stock's volatility",
            ],
            answer: 0,
            explanation: "Margin is net income divided by revenue.",
          },
        ],
      },
      {
        id: "rc-2",
        title: "The balance sheet",
        subtitle: "What it owns and owes",
        minutes: 6,
        xp: 35,
        slides: [
          {
            title: "Assets, liabilities, equity",
            body: [
              "The balance sheet is a snapshot: assets (what the company owns) minus liabilities (what it owes) equals shareholders' equity.",
              "A strong balance sheet means manageable debt and enough assets to weather tough times.",
            ],
            keyTakeaway: "Assets - liabilities = equity. It shows financial strength at a point in time.",
          },
          {
            title: "Watching debt",
            body: [
              "Too much debt can be dangerous, especially if profits fall or interest rates rise.",
              "Investors compare debt to equity or earnings to judge whether a company's borrowing is healthy.",
            ],
          },
        ],
        questions: [
          {
            id: "rc-2-q1",
            type: "multiple_choice",
            prompt: "Shareholders' equity equals:",
            options: [
              "Assets plus liabilities",
              "Assets minus liabilities",
              "Revenue minus dividends",
              "Share price times P/E",
            ],
            answer: 1,
            explanation: "Equity is what's left after subtracting liabilities from assets.",
          },
          {
            id: "rc-2-q2",
            type: "true_false",
            prompt: "High debt can increase a company's risk if profits fall.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Debt must be serviced regardless of profits, raising risk in downturns.",
          },
        ],
      },
      {
        id: "rc-3",
        title: "Valuation ratios",
        subtitle: "Is it cheap or expensive?",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "The P/E ratio",
            body: [
              "Price-to-earnings (P/E) divides the share price by earnings per share. It shows how much you pay for each dollar of profit.",
              "A high P/E can mean high growth expectations — or an overvalued stock. Context and comparison are everything.",
            ],
            keyTakeaway: "P/E tells you the price tag on a company's earnings. Compare it to peers and history.",
          },
          {
            title: "Other useful ratios",
            body: [
              "Price-to-sales (P/S) helps value companies with little or no profit yet.",
              "Price-to-book (P/B) compares price to net asset value — useful for asset-heavy businesses.",
            ],
          },
          {
            title: "No single number decides",
            body: [
              "Ratios are shortcuts, not verdicts. A 'cheap' stock can be cheap for good reason (a value trap).",
              "Use ratios to ask better questions, then dig into why the numbers look the way they do.",
            ],
          },
        ],
        questions: [
          {
            id: "rc-3-q1",
            type: "multiple_choice",
            prompt: "The P/E ratio compares price to:",
            options: ["Revenue", "Earnings per share", "Dividends", "Debt"],
            answer: 1,
            explanation: "P/E is share price divided by earnings per share.",
          },
          {
            id: "rc-3-q2",
            type: "true_false",
            prompt: "A low P/E always means a stock is a good buy.",
            options: ["True", "False"],
            answer: 1,
            explanation: "A low P/E can signal a value trap — cheap for a reason.",
          },
          {
            id: "rc-3-q3",
            type: "multiple_choice",
            prompt: "Price-to-sales is especially useful for:",
            options: [
              "Companies with little or no profit yet",
              "Bonds",
              "Cash accounts",
              "Choosing a broker",
            ],
            answer: 0,
            explanation: "P/S helps value companies that aren't profitable yet.",
          },
        ],
      },
      {
        id: "rc-4",
        title: "Dividends and yield",
        subtitle: "Getting paid to hold",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "What a dividend is",
            body: [
              "A dividend is a cash payment some companies distribute to shareholders, usually quarterly, from profits.",
              "Dividend yield is the annual dividend divided by the share price, shown as a percentage.",
            ],
            keyTakeaway: "Yield = annual dividend / price. It's the income rate you earn from dividends.",
          },
          {
            title: "Sustainability over size",
            body: [
              "A very high yield can be a warning sign — it may reflect a falling share price or a payout the company can't sustain.",
              "The payout ratio (dividends divided by earnings) shows whether a dividend is comfortably affordable.",
            ],
          },
        ],
        questions: [
          {
            id: "rc-4-q1",
            type: "multiple_choice",
            prompt: "Dividend yield is:",
            options: [
              "Annual dividend divided by share price",
              "Total profit",
              "The number of shares",
              "The P/E ratio",
            ],
            answer: 0,
            explanation: "Yield expresses the annual dividend as a percentage of the price.",
          },
          {
            id: "rc-4-q2",
            type: "true_false",
            prompt: "An unusually high dividend yield can be a warning sign.",
            options: ["True", "False"],
            answer: 0,
            explanation: "A very high yield may reflect a dropping price or an unsustainable payout.",
          },
        ],
      },
      {
        id: "rc-5",
        title: "Earnings season",
        subtitle: "When companies report",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Quarterly report cards",
            body: [
              "Public companies report results every quarter. This 'earnings season' can move prices sharply.",
              "Analysts set expectations; a stock often reacts to whether results beat or miss those expectations — not just the raw numbers.",
            ],
            keyTakeaway: "Markets trade on surprises versus expectations, not just good or bad numbers.",
          },
          {
            title: "Guidance and the call",
            body: [
              "Management often shares 'guidance' — its outlook for coming quarters. Guidance can matter more than the current results.",
              "Earnings calls let management explain the numbers and answer analyst questions.",
            ],
          },
        ],
        questions: [
          {
            id: "rc-5-q1",
            type: "multiple_choice",
            prompt: "Stocks often move on earnings because of:",
            options: [
              "Results versus expectations",
              "The color of the report",
              "The day of the week",
              "The CEO's age",
            ],
            answer: 0,
            explanation: "Prices react to how results compare to analyst expectations.",
          },
          {
            id: "rc-5-q2",
            type: "true_false",
            prompt: "Forward guidance can move a stock more than current results.",
            options: ["True", "False"],
            answer: 0,
            explanation: "The outlook for the future often matters more than the latest quarter.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 8. FUNDS & FIXED INCOME
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "funds-and-income",
    title: "Funds & Fixed Income",
    description: "Mutual funds, index vs active, bonds, and income-producing assets like REITs.",
    level: "Intermediate",
    icon: "🧺",
    color: "#ce93d8",
    lessons: [
      {
        id: "fi-1",
        title: "Mutual funds vs. ETFs",
        subtitle: "Two ways to buy a basket",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Same idea, different mechanics",
            body: [
              "Both pool money to buy a diversified basket of assets. The difference is how you trade them.",
              "ETFs trade all day on an exchange like a stock. Mutual funds are priced once daily after the market closes.",
            ],
            keyTakeaway: "ETFs trade intraday; mutual funds settle at one daily price.",
          },
          {
            title: "Costs and minimums",
            body: [
              "ETFs often have lower expense ratios and no minimum beyond one share's price.",
              "Some mutual funds require minimum investments but allow automatic recurring contributions easily.",
            ],
          },
        ],
        questions: [
          {
            id: "fi-1-q1",
            type: "multiple_choice",
            prompt: "A key difference between ETFs and mutual funds is:",
            options: [
              "ETFs trade throughout the day; mutual funds price once daily",
              "Only ETFs are diversified",
              "Mutual funds can't hold stocks",
              "ETFs never charge fees",
            ],
            answer: 0,
            explanation: "ETFs trade intraday; mutual funds are priced once per day.",
          },
          {
            id: "fi-1-q2",
            type: "true_false",
            prompt: "Both mutual funds and ETFs can offer diversification.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Both pool money into a diversified basket of holdings.",
          },
        ],
      },
      {
        id: "fi-2",
        title: "Index vs. active",
        subtitle: "The great debate",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "Two philosophies",
            body: [
              "Index funds aim to match a market index at very low cost. Active funds pay managers to try to beat the market.",
              "Over long periods, most active funds fail to beat their index after fees — a well-documented pattern.",
            ],
            keyTakeaway: "Low-cost index investing is hard to beat over the long run, largely because of fees.",
          },
          {
            title: "Why fees are decisive",
            body: [
              "A 1% higher annual fee may sound tiny, but compounded over decades it can consume a large share of your returns.",
              "This is why many long-term investors default to broad, low-cost index funds.",
            ],
          },
        ],
        questions: [
          {
            id: "fi-2-q1",
            type: "multiple_choice",
            prompt: "An index fund aims to:",
            options: [
              "Beat the market through stock picking",
              "Match a market index at low cost",
              "Guarantee profits",
              "Avoid all stocks",
            ],
            answer: 1,
            explanation: "Index funds track an index cheaply rather than trying to beat it.",
          },
          {
            id: "fi-2-q2",
            type: "true_false",
            prompt: "Most active funds beat their index over the long run after fees.",
            options: ["True", "False"],
            answer: 1,
            explanation: "The majority underperform their benchmark after costs over long periods.",
          },
          {
            id: "fi-2-q3",
            type: "multiple_choice",
            prompt: "Why do small annual fees matter so much?",
            options: [
              "They compound against you over decades",
              "They are illegal",
              "They only apply to bonds",
              "They don't matter",
            ],
            answer: 0,
            explanation: "Compounded over time, fees can erode a large portion of returns.",
          },
        ],
      },
      {
        id: "fi-3",
        title: "Bonds explained",
        subtitle: "Lending instead of owning",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "You're the lender",
            body: [
              "A bond is a loan you make to a government or company. They pay you interest and return the principal at maturity.",
              "Unlike stocks, bonds don't give ownership — they're a contractual IOU.",
            ],
            keyTakeaway: "Stocks = ownership. Bonds = lending money for interest.",
          },
          {
            title: "Prices and interest rates",
            body: [
              "Bond prices move opposite to interest rates: when rates rise, existing bonds with lower rates become less valuable.",
              "Longer-term bonds are more sensitive to rate changes than short-term ones.",
            ],
          },
          {
            title: "Role in a portfolio",
            body: [
              "Bonds are generally less volatile than stocks and can cushion a portfolio during stock downturns.",
              "They typically offer lower long-term returns in exchange for that stability.",
            ],
          },
        ],
        questions: [
          {
            id: "fi-3-q1",
            type: "multiple_choice",
            prompt: "When you buy a bond, you are:",
            options: [
              "Buying ownership in a company",
              "Lending money in exchange for interest",
              "Buying an option",
              "Paying a dividend",
            ],
            answer: 1,
            explanation: "A bond is a loan that pays you interest and returns principal at maturity.",
          },
          {
            id: "fi-3-q2",
            type: "multiple_choice",
            prompt: "When interest rates rise, existing bond prices generally:",
            options: ["Rise", "Fall", "Stay the same", "Double"],
            answer: 1,
            explanation: "Bond prices move inversely to interest rates.",
          },
          {
            id: "fi-3-q3",
            type: "true_false",
            prompt: "Bonds are typically less volatile than stocks.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Bonds usually have lower volatility, adding stability to a portfolio.",
          },
        ],
      },
      {
        id: "fi-4",
        title: "REITs and income assets",
        subtitle: "Real estate without a mortgage",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "What a REIT is",
            body: [
              "A REIT (real estate investment trust) owns income-producing property and trades like a stock.",
              "REITs let you invest in real estate without buying or managing physical property.",
            ],
            keyTakeaway: "REITs offer real-estate exposure and income in a single, tradable security.",
          },
          {
            title: "Income and diversification",
            body: [
              "REITs typically pay high dividends because they must distribute most of their income.",
              "They add diversification since real estate doesn't always move in step with stocks.",
            ],
          },
        ],
        questions: [
          {
            id: "fi-4-q1",
            type: "multiple_choice",
            prompt: "A REIT lets you:",
            options: [
              "Invest in real estate without owning property directly",
              "Avoid all risk",
              "Buy government bonds only",
              "Trade options",
            ],
            answer: 0,
            explanation: "REITs provide real-estate exposure in a tradable security.",
          },
          {
            id: "fi-4-q2",
            type: "true_false",
            prompt: "REITs often pay relatively high dividends.",
            options: ["True", "False"],
            answer: 0,
            explanation: "REITs must distribute most income, so they tend to pay high dividends.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 9. INVESTING STRATEGIES
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "investing-strategies",
    title: "Investing Strategies",
    description: "Value, growth, income, indexing, and how to keep a portfolio on track.",
    level: "Intermediate",
    icon: "♟️",
    color: "#ffb74d",
    lessons: [
      {
        id: "is-1",
        title: "Value investing",
        subtitle: "Buying below worth",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Price vs. value",
            body: [
              "Value investors look for solid companies trading for less than their estimated intrinsic worth.",
              "The idea: buy at a discount and wait for the market to recognize the true value.",
            ],
            keyTakeaway: "Value investing seeks a margin of safety — paying less than something is worth.",
          },
          {
            title: "Patience required",
            body: [
              "Undervalued stocks can stay cheap for a long time, testing an investor's patience.",
              "Value investing rewards discipline and a long horizon more than quick action.",
            ],
          },
        ],
        questions: [
          {
            id: "is-1-q1",
            type: "multiple_choice",
            prompt: "Value investing focuses on:",
            options: [
              "Buying companies below their intrinsic worth",
              "Only buying the most popular stocks",
              "Day trading",
              "Avoiding research",
            ],
            answer: 0,
            explanation: "Value investors buy at a discount to estimated intrinsic value.",
          },
          {
            id: "is-1-q2",
            type: "true_false",
            prompt: "A 'margin of safety' means paying less than an asset's estimated worth.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Buying below intrinsic value creates a cushion against errors.",
          },
        ],
      },
      {
        id: "is-2",
        title: "Growth investing",
        subtitle: "Betting on the future",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Paying up for growth",
            body: [
              "Growth investors seek companies expanding revenue and earnings rapidly, even if they look expensive today.",
              "The bet is that fast future growth will justify — and exceed — today's high price.",
            ],
            keyTakeaway: "Growth investing prioritizes future potential over current cheapness.",
          },
          {
            title: "The risk",
            body: [
              "High expectations mean high stakes: if growth slows, these stocks can fall hard.",
              "Growth and value aren't enemies — many investors blend both across their portfolio.",
            ],
          },
        ],
        questions: [
          {
            id: "is-2-q1",
            type: "multiple_choice",
            prompt: "Growth investors are willing to:",
            options: [
              "Pay more today for strong expected future growth",
              "Only buy cheap stocks",
              "Avoid all technology companies",
              "Never hold for long",
            ],
            answer: 0,
            explanation: "Growth investing pays a premium for high future-growth potential.",
          },
          {
            id: "is-2-q2",
            type: "true_false",
            prompt: "Growth stocks can fall sharply if their growth slows.",
            options: ["True", "False"],
            answer: 0,
            explanation: "High expectations make growth stocks vulnerable to disappointments.",
          },
        ],
      },
      {
        id: "is-3",
        title: "Income and dividend investing",
        subtitle: "Cash flow from your portfolio",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Investing for income",
            body: [
              "Income investors favor assets that pay steady cash — dividend stocks, bonds, and REITs.",
              "Reinvesting those payments can compound powerfully; spending them can fund living expenses in retirement.",
            ],
            keyTakeaway: "Income investing turns your portfolio into a stream of cash flow.",
          },
          {
            title: "Quality over yield",
            body: [
              "Chasing the highest yields can backfire. Reliable, growing payouts often beat sky-high but fragile ones.",
              "Companies that steadily raise dividends signal financial discipline and confidence.",
            ],
          },
        ],
        questions: [
          {
            id: "is-3-q1",
            type: "multiple_choice",
            prompt: "Income investing focuses on:",
            options: [
              "Assets that produce steady cash flow",
              "Only the riskiest stocks",
              "Never receiving dividends",
              "Avoiding bonds entirely",
            ],
            answer: 0,
            explanation: "Income investors seek steady cash from dividends, bonds, and REITs.",
          },
          {
            id: "is-3-q2",
            type: "true_false",
            prompt: "The highest available yield is always the best income choice.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Reliable, growing payouts usually beat fragile ultra-high yields.",
          },
        ],
      },
      {
        id: "is-4",
        title: "Rebalancing",
        subtitle: "Keeping your mix on target",
        minutes: 5,
        xp: 40,
        slides: [
          {
            title: "Drift happens",
            body: [
              "Over time, winners grow to take up more of your portfolio than intended, shifting your risk level.",
              "Rebalancing means periodically trimming what's grown and topping up what's lagged to restore your target mix.",
            ],
            keyTakeaway: "Rebalancing resets your portfolio to its intended risk level.",
          },
          {
            title: "A built-in discipline",
            body: [
              "Rebalancing naturally has you sell high and buy low — the opposite of chasing performance.",
              "Many investors rebalance on a schedule (like yearly) or when an allocation drifts past a set threshold.",
            ],
          },
        ],
        questions: [
          {
            id: "is-4-q1",
            type: "multiple_choice",
            prompt: "Rebalancing means:",
            options: [
              "Selling everything each year",
              "Restoring your portfolio to its target allocation",
              "Only buying new stocks",
              "Never selling",
            ],
            answer: 1,
            explanation: "Rebalancing trims and tops up holdings to hit your target mix.",
          },
          {
            id: "is-4-q2",
            type: "true_false",
            prompt: "Rebalancing tends to have you sell high and buy low.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Trimming winners and adding to laggards is a sell-high, buy-low discipline.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 10. TAXES & ACCOUNT OPTIMIZATION
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "taxes-optimization",
    title: "Taxes & Optimization",
    description: "Keep more of what you earn: capital gains, tax-loss harvesting, and account placement.",
    level: "Advanced",
    icon: "🧾",
    color: "#90caf9",
    lessons: [
      {
        id: "tx-1",
        title: "Capital gains basics",
        subtitle: "How investment profits are taxed",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "Gains and when they're taxed",
            body: [
              "A capital gain is the profit when you sell an investment for more than you paid.",
              "In a taxable account, gains generally trigger tax only when you sell — until then, they're 'unrealized'.",
            ],
            keyTakeaway: "You typically owe tax on gains when you sell, not while you hold.",
          },
          {
            title: "Holding period can matter",
            body: [
              "In many tax systems, assets held longer are taxed more favorably than those sold quickly.",
              "This rewards patient, long-term investing and penalizes rapid trading.",
            ],
          },
        ],
        questions: [
          {
            id: "tx-1-q1",
            type: "multiple_choice",
            prompt: "In a taxable account, a capital gain is generally taxed:",
            options: [
              "Every year whether you sell or not",
              "When you sell the investment for a profit",
              "Never",
              "Only on dividends",
            ],
            answer: 1,
            explanation: "Gains are usually taxed when realized — that is, when you sell.",
          },
          {
            id: "tx-1-q2",
            type: "true_false",
            prompt: "Unrealized gains are profits on investments you still hold.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Unrealized gains exist on paper until you sell and 'realize' them.",
          },
        ],
      },
      {
        id: "tx-2",
        title: "Tax-loss harvesting",
        subtitle: "Turning losses into savings",
        minutes: 6,
        xp: 45,
        slides: [
          {
            title: "Using losses on purpose",
            body: [
              "Tax-loss harvesting means selling an investment at a loss to offset taxable gains elsewhere.",
              "It can reduce your tax bill while keeping you invested in something similar.",
            ],
            keyTakeaway: "Realized losses can offset realized gains, lowering taxes owed.",
          },
          {
            title: "Beware wash-sale rules",
            body: [
              "Many tax systems disallow the loss if you rebuy the same (or a nearly identical) security within a set window.",
              "The fix is often to buy a similar-but-not-identical fund to stay invested without triggering the rule.",
            ],
          },
        ],
        questions: [
          {
            id: "tx-2-q1",
            type: "multiple_choice",
            prompt: "Tax-loss harvesting involves:",
            options: [
              "Selling losers to offset taxable gains",
              "Only buying winners",
              "Avoiding taxes illegally",
              "Never selling anything",
            ],
            answer: 0,
            explanation: "You realize a loss to offset gains and reduce taxes.",
          },
          {
            id: "tx-2-q2",
            type: "true_false",
            prompt: "A wash-sale rule may disallow a loss if you quickly rebuy the same security.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Rebuying an identical security too soon can void the harvested loss.",
          },
        ],
      },
      {
        id: "tx-3",
        title: "Asset location",
        subtitle: "The right account for each asset",
        minutes: 6,
        xp: 45,
        slides: [
          {
            title: "Location, not just allocation",
            body: [
              "Asset location means placing investments in the account type where they're taxed most efficiently.",
              "It's different from asset allocation (your mix); location is about which bucket each holding sits in.",
            ],
            keyTakeaway: "The same portfolio can owe less tax simply by placing assets in the right accounts.",
          },
          {
            title: "A common approach",
            body: [
              "Tax-inefficient assets (like high-interest bonds) often fit better in tax-sheltered accounts.",
              "Tax-efficient assets (like broad index funds) can sit comfortably in taxable accounts.",
            ],
          },
        ],
        questions: [
          {
            id: "tx-3-q1",
            type: "multiple_choice",
            prompt: "Asset location refers to:",
            options: [
              "Which country you live in",
              "Which account type holds each investment for tax efficiency",
              "Your home address",
              "The stock exchange used",
            ],
            answer: 1,
            explanation: "It's about placing holdings in the most tax-efficient account.",
          },
          {
            id: "tx-3-q2",
            type: "true_false",
            prompt: "Asset location is the same thing as asset allocation.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Allocation is your mix; location is which account holds each asset.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 11. CRYPTO & ALTERNATIVES
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "crypto-alternatives",
    title: "Crypto & Alternatives",
    description: "Beyond stocks and bonds: crypto, commodities, and speculative position sizing.",
    level: "Advanced",
    icon: "🪙",
    color: "#ffd54f",
    lessons: [
      {
        id: "ca-1",
        title: "What is cryptocurrency?",
        subtitle: "Digital assets explained",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "Money without a middleman",
            body: [
              "Cryptocurrencies are digital assets that run on decentralized networks called blockchains, without a central bank.",
              "A blockchain is a shared, tamper-resistant ledger recording every transaction across many computers.",
            ],
            keyTakeaway: "Crypto runs on decentralized blockchains rather than a central authority.",
          },
          {
            title: "Volatility and risk",
            body: [
              "Crypto prices can swing dramatically — far more than most stocks — in short periods.",
              "It's an emerging, speculative asset class with regulatory and security risks to understand before investing.",
            ],
          },
        ],
        questions: [
          {
            id: "ca-1-q1",
            type: "multiple_choice",
            prompt: "A blockchain is best described as:",
            options: [
              "A central bank",
              "A shared, tamper-resistant transaction ledger",
              "A type of stock",
              "A savings account",
            ],
            answer: 1,
            explanation: "A blockchain is a distributed, tamper-resistant ledger of transactions.",
          },
          {
            id: "ca-1-q2",
            type: "true_false",
            prompt: "Crypto is generally less volatile than large-cap stocks.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Crypto is typically far more volatile than most stocks.",
          },
        ],
      },
      {
        id: "ca-2",
        title: "Other alternative assets",
        subtitle: "Gold, commodities, and more",
        minutes: 5,
        xp: 40,
        slides: [
          {
            title: "Beyond stocks and bonds",
            body: [
              "Alternatives include commodities (like gold and oil), real estate, and collectibles.",
              "Some investors use small allocations to alternatives for diversification, since they may not move in step with stocks.",
            ],
            keyTakeaway: "Alternatives can diversify, but often produce no income and can be volatile.",
          },
          {
            title: "Know the trade-offs",
            body: [
              "Commodities like gold pay no dividends or interest — returns rely purely on price changes.",
              "They can shine in specific environments (like high inflation) but lag over long stretches.",
            ],
          },
        ],
        questions: [
          {
            id: "ca-2-q1",
            type: "multiple_choice",
            prompt: "A key trait of commodities like gold is that they:",
            options: [
              "Pay a guaranteed dividend",
              "Produce no income; returns depend on price changes",
              "Never change in value",
              "Are risk-free",
            ],
            answer: 1,
            explanation: "Commodities generate no income; gains come only from price movement.",
          },
          {
            id: "ca-2-q2",
            type: "true_false",
            prompt: "Alternatives can help diversify because they may not move with stocks.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Low correlation with stocks is a key reason to hold some alternatives.",
          },
        ],
      },
      {
        id: "ca-3",
        title: "Position sizing for speculation",
        subtitle: "Bet small on big risks",
        minutes: 5,
        xp: 45,
        slides: [
          {
            title: "Only risk what you can lose",
            body: [
              "Speculative assets can go to zero. A common rule is to limit them to a small slice of your portfolio.",
              "That way, a total loss is survivable and won't derail your long-term plan.",
            ],
            keyTakeaway: "Size speculative bets so a total loss wouldn't hurt your core goals.",
          },
          {
            title: "Keep the core boring",
            body: [
              "Many investors keep a stable, diversified core and a small 'satellite' for speculation.",
              "This lets you explore high-risk ideas without gambling your foundation.",
            ],
          },
        ],
        questions: [
          {
            id: "ca-3-q1",
            type: "multiple_choice",
            prompt: "A sensible approach to speculative assets is to:",
            options: [
              "Put your entire portfolio in them",
              "Limit them to a small, losable slice",
              "Borrow money to buy more",
              "Avoid diversification",
            ],
            answer: 1,
            explanation: "Keeping speculation small makes a total loss survivable.",
          },
          {
            id: "ca-3-q2",
            type: "true_false",
            prompt: "A core-and-satellite approach pairs a stable core with a small speculative portion.",
            options: ["True", "False"],
            answer: 0,
            explanation: "The core stays diversified; the satellite explores higher-risk ideas.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 12. ADVANCED OPTIONS
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "advanced-options",
    title: "Advanced Options",
    description: "Level up: the Greeks, spreads, protective puts, and cash-secured puts.",
    level: "Advanced",
    icon: "🧠",
    color: "#f48fb1",
    lessons: [
      {
        id: "ao-1",
        title: "The Greeks",
        subtitle: "Measuring option risk",
        minutes: 6,
        xp: 45,
        slides: [
          {
            title: "Delta and theta",
            body: [
              "Delta estimates how much an option's price moves when the underlying moves $1.",
              "Theta measures time decay — how much value an option loses each day as expiration nears.",
            ],
            keyTakeaway: "Delta = sensitivity to price. Theta = the cost of time passing.",
          },
          {
            title: "Vega and gamma",
            body: [
              "Vega measures sensitivity to changes in implied volatility — rising volatility generally lifts option prices.",
              "Gamma measures how fast delta itself changes as the underlying moves.",
            ],
          },
        ],
        questions: [
          {
            id: "ao-1-q1",
            type: "multiple_choice",
            prompt: "Delta estimates:",
            options: [
              "How much an option moves per $1 move in the underlying",
              "The dividend yield",
              "The expiration date",
              "The number of contracts",
            ],
            answer: 0,
            explanation: "Delta is the option's price sensitivity to the underlying's price.",
          },
          {
            id: "ao-1-q2",
            type: "multiple_choice",
            prompt: "Vega measures sensitivity to:",
            options: ["Interest rates", "Implied volatility", "Dividends", "Trading volume"],
            answer: 1,
            explanation: "Vega reflects how option prices respond to changes in implied volatility.",
          },
        ],
      },
      {
        id: "ao-2",
        title: "Protective puts",
        subtitle: "Insurance for your shares",
        minutes: 5,
        xp: 45,
        slides: [
          {
            title: "Buying downside protection",
            body: [
              "A protective put means owning shares and buying a put to limit losses below the strike.",
              "It works like insurance: you pay a premium for protection against a big drop.",
            ],
            keyTakeaway: "A protective put caps downside risk at the cost of the premium.",
          },
          {
            title: "The cost of safety",
            body: [
              "That premium reduces your returns if the stock rises or stays flat — the price of peace of mind.",
              "Investors often use protective puts around events they expect to be volatile.",
            ],
          },
        ],
        questions: [
          {
            id: "ao-2-q1",
            type: "multiple_choice",
            prompt: "A protective put is used to:",
            options: [
              "Limit downside losses on shares you own",
              "Guarantee a profit",
              "Increase leverage to the maximum",
              "Collect dividends",
            ],
            answer: 0,
            explanation: "It sets a floor on losses, like insurance, for a premium cost.",
          },
          {
            id: "ao-2-q2",
            type: "true_false",
            prompt: "A protective put is free to put on.",
            options: ["True", "False"],
            answer: 1,
            explanation: "You pay a premium for the protection, which reduces net returns.",
          },
        ],
      },
      {
        id: "ao-3",
        title: "Option spreads",
        subtitle: "Combining contracts",
        minutes: 6,
        xp: 50,
        slides: [
          {
            title: "Buying and selling together",
            body: [
              "A spread combines buying one option and selling another to shape risk and reward.",
              "For example, a vertical spread buys one strike and sells another, capping both potential gain and loss.",
            ],
            keyTakeaway: "Spreads trade away some upside to lower cost and define risk.",
          },
          {
            title: "Why traders use them",
            body: [
              "Selling one leg offsets the cost of the leg you buy, making a position cheaper.",
              "The trade-off is a capped maximum profit, since you gave up part of the upside.",
            ],
          },
        ],
        questions: [
          {
            id: "ao-3-q1",
            type: "multiple_choice",
            prompt: "An option spread typically involves:",
            options: [
              "Only buying a single option",
              "Buying one option and selling another together",
              "Selling all your stock",
              "Avoiding options entirely",
            ],
            answer: 1,
            explanation: "Spreads pair a bought and a sold option to define risk and reward.",
          },
          {
            id: "ao-3-q2",
            type: "true_false",
            prompt: "A vertical spread usually caps both the maximum gain and maximum loss.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Selling a leg lowers cost but caps the upside; loss is also defined.",
          },
        ],
      },
      {
        id: "ao-4",
        title: "Cash-secured puts",
        subtitle: "Getting paid to wait",
        minutes: 6,
        xp: 50,
        slides: [
          {
            title: "Selling a put with cash set aside",
            body: [
              "You sell a put and hold enough cash to buy the shares if assigned. You collect the premium up front.",
              "If the stock stays above the strike, you keep the premium. If it falls below, you buy shares at the strike — a price you already liked.",
            ],
            keyTakeaway: "Cash-secured puts pay you income while you wait to buy at a target price.",
          },
          {
            title: "Understand assignment",
            body: [
              "If assigned, you're obligated to buy 100 shares per contract at the strike, even if the market price is lower.",
              "Only sell puts on companies you'd genuinely be happy to own at that strike.",
            ],
          },
        ],
        questions: [
          {
            id: "ao-4-q1",
            type: "multiple_choice",
            prompt: "A cash-secured put means you:",
            options: [
              "Sell a put and hold cash to buy shares if assigned",
              "Buy unlimited calls",
              "Borrow to sell options",
              "Never take delivery of shares",
            ],
            answer: 0,
            explanation: "You sell the put and reserve cash to purchase shares if assigned.",
          },
          {
            id: "ao-4-q2",
            type: "true_false",
            prompt: "If assigned on a put you sold, you must buy the shares at the strike price.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Assignment obligates you to buy at the strike, even if market price is lower.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 13. PLANNING & PITFALLS
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "planning-pitfalls",
    title: "Planning & Pitfalls",
    description: "Turn knowledge into a lifelong plan — and dodge the mistakes that sink returns.",
    level: "Advanced",
    icon: "🧭",
    color: "#80cbc4",
    lessons: [
      {
        id: "pp-1",
        title: "Goal-based investing",
        subtitle: "Start with the why",
        minutes: 5,
        xp: 40,
        slides: [
          {
            title: "Match money to goals",
            body: [
              "Different goals have different timelines: a house in 3 years is not the same as retirement in 30.",
              "Short-term money belongs in safer assets; long-term money can take on more growth risk.",
            ],
            keyTakeaway: "Your time horizon for each goal should drive how you invest that money.",
          },
          {
            title: "One plan, many buckets",
            body: [
              "Separating money into goal buckets keeps you from raiding long-term savings for short-term wants.",
              "Each bucket can have its own risk level and target.",
            ],
          },
        ],
        questions: [
          {
            id: "pp-1-q1",
            type: "multiple_choice",
            prompt: "Money you need in a couple of years should generally be:",
            options: [
              "In the most aggressive stocks",
              "In safer, less volatile assets",
              "In speculative crypto",
              "Fully in options",
            ],
            answer: 1,
            explanation: "Short-horizon money needs stability, not volatility.",
          },
          {
            id: "pp-1-q2",
            type: "true_false",
            prompt: "A longer time horizon can justify taking on more growth risk.",
            options: ["True", "False"],
            answer: 0,
            explanation: "More time allows recovery from volatility, supporting more risk.",
          },
        ],
      },
      {
        id: "pp-2",
        title: "Retirement planning",
        subtitle: "Investing for the long game",
        minutes: 6,
        xp: 45,
        slides: [
          {
            title: "Start early, contribute steadily",
            body: [
              "Retirement is the ultimate long-term goal, where compounding has decades to work.",
              "Regular contributions to tax-advantaged accounts, invested in diversified funds, do most of the heavy lifting.",
            ],
            keyTakeaway: "Consistent contributions plus time are more powerful than perfect stock picks.",
          },
          {
            title: "Glide toward safety",
            body: [
              "Many people gradually shift from stocks toward bonds as retirement approaches, protecting accumulated wealth.",
              "Target-date funds automate this glide path for you.",
            ],
          },
        ],
        questions: [
          {
            id: "pp-2-q1",
            type: "multiple_choice",
            prompt: "The biggest driver of retirement success is usually:",
            options: [
              "Picking the single best stock",
              "Consistent contributions invested over a long time",
              "Timing the market",
              "Trading options daily",
            ],
            answer: 1,
            explanation: "Steady contributions plus time and compounding do the heavy lifting.",
          },
          {
            id: "pp-2-q2",
            type: "multiple_choice",
            prompt: "A target-date fund automatically:",
            options: [
              "Guarantees a return",
              "Shifts toward safer assets as the date approaches",
              "Only holds one stock",
              "Avoids all bonds",
            ],
            answer: 1,
            explanation: "Target-date funds glide from stocks toward bonds over time.",
          },
        ],
      },
      {
        id: "pp-3",
        title: "Fees and costs",
        subtitle: "The silent return killer",
        minutes: 5,
        xp: 40,
        slides: [
          {
            title: "Small percentages, big impact",
            body: [
              "Management fees, fund expense ratios, and frequent trading costs quietly erode returns.",
              "Because they compound over decades, even a 1% difference can cost a large share of your final wealth.",
            ],
            keyTakeaway: "Minimizing avoidable fees is one of the few 'free' ways to boost returns.",
          },
          {
            title: "What to watch",
            body: [
              "Compare expense ratios between similar funds and favor low-cost options where sensible.",
              "Beware products with layered fees or commissions that aren't clearly disclosed.",
            ],
          },
        ],
        questions: [
          {
            id: "pp-3-q1",
            type: "true_false",
            prompt: "A 1% annual fee difference is negligible over a lifetime of investing.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Compounded over decades, 1% can consume a large portion of returns.",
          },
          {
            id: "pp-3-q2",
            type: "multiple_choice",
            prompt: "A practical way to reduce costs is to:",
            options: [
              "Trade as often as possible",
              "Favor low-cost funds among similar options",
              "Ignore expense ratios",
              "Always pick the priciest fund",
            ],
            answer: 1,
            explanation: "Choosing low-cost funds keeps more of your returns.",
          },
        ],
      },
      {
        id: "pp-4",
        title: "Avoiding scams and hype",
        subtitle: "Protecting your money",
        minutes: 5,
        xp: 45,
        slides: [
          {
            title: "If it sounds too good to be true…",
            body: [
              "Promises of guaranteed high returns with no risk are the hallmark of scams.",
              "Pressure to act now, secrecy, and 'can't-lose' pitches are major red flags.",
            ],
            keyTakeaway: "Guaranteed high returns with no risk do not exist. Walk away.",
          },
          {
            title: "Hype and FOMO",
            body: [
              "Social media can whip up fear of missing out on the 'next big thing'. Chasing hype often means buying at the top.",
              "Stick to your plan, verify claims independently, and never invest based on pressure alone.",
            ],
          },
        ],
        questions: [
          {
            id: "pp-4-q1",
            type: "multiple_choice",
            prompt: "A classic sign of an investment scam is:",
            options: [
              "Clear disclosure of risks",
              "A promise of guaranteed high returns with no risk",
              "Low fees",
              "A diversified portfolio",
            ],
            answer: 1,
            explanation: "Guaranteed, risk-free high returns are a hallmark of fraud.",
          },
          {
            id: "pp-4-q2",
            type: "true_false",
            prompt: "Acting on social-media hype and FOMO often leads to buying at the top.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Chasing hype frequently means buying after prices have already surged.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 14. MARKET MECHANICS
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "market-mechanics",
    title: "Market Mechanics",
    description: "How the plumbing works: settlement, trading hours, splits, buybacks, DRIPs, and IPOs.",
    level: "Intermediate",
    icon: "⚙️",
    color: "#7cc6fe",
    lessons: [
      {
        id: "mm-1",
        title: "Settlement and T+1",
        subtitle: "When a trade is really done",
        minutes: 5,
        xp: 30,
        slides: [
          {
            title: "Execution vs. settlement",
            body: [
              "When your order fills, the trade is 'executed' — but ownership and cash officially change hands a bit later, at 'settlement'.",
              "US stocks now settle one business day after the trade, known as T+1.",
            ],
            keyTakeaway: "Execution is instant; settlement (T+1 for US stocks) is when it's final.",
          },
          {
            title: "Why it matters",
            body: [
              "Proceeds from a sale may be marked 'unsettled' briefly before you can withdraw them.",
              "Trading with unsettled cash in a cash account can trigger 'good faith' or 'freeride' violations at real brokers.",
            ],
          },
        ],
        questions: [
          {
            id: "mm-1-q1",
            type: "multiple_choice",
            prompt: "US stocks currently settle on which cycle?",
            options: ["T+0 (same day)", "T+1 (next business day)", "T+3", "T+7"],
            answer: 1,
            explanation: "US equities moved to a T+1 settlement cycle — one business day after the trade.",
          },
          {
            id: "mm-1-q2",
            type: "true_false",
            prompt: "Execution and settlement happen at the exact same moment.",
            options: ["True", "False"],
            answer: 1,
            explanation: "A trade executes immediately but settles later, when cash and shares officially transfer.",
          },
        ],
      },
      {
        id: "mm-2",
        title: "Trading hours",
        subtitle: "Regular, pre-market, and after-hours",
        minutes: 5,
        xp: 30,
        slides: [
          {
            title: "The regular session",
            body: [
              "US markets have a regular session (9:30am–4:00pm ET). Most volume happens here, so spreads are tightest.",
              "Outside those hours, pre-market and after-hours sessions let some traders act on news early.",
            ],
            keyTakeaway: "Liquidity is highest during regular hours; extended hours are thinner.",
          },
          {
            title: "Extended-hours risk",
            body: [
              "Extended-hours trading has fewer participants, wider spreads, and can be more volatile.",
              "Prices there don't always carry over to the next regular open.",
            ],
          },
        ],
        questions: [
          {
            id: "mm-2-q1",
            type: "multiple_choice",
            prompt: "Compared to regular hours, extended-hours trading usually has:",
            options: [
              "Tighter spreads and more liquidity",
              "Wider spreads and less liquidity",
              "No risk",
              "Guaranteed better prices",
            ],
            answer: 1,
            explanation: "Fewer participants mean wider spreads and thinner, more volatile trading.",
          },
          {
            id: "mm-2-q2",
            type: "true_false",
            prompt: "Most trading volume occurs during the regular session.",
            options: ["True", "False"],
            answer: 0,
            explanation: "The regular session sees the bulk of volume and the tightest spreads.",
          },
        ],
      },
      {
        id: "mm-3",
        title: "Stock splits",
        subtitle: "Same pie, more slices",
        minutes: 4,
        xp: 30,
        slides: [
          {
            title: "What a split does",
            body: [
              "In a stock split, a company increases its share count and lowers the price proportionally. A 2-for-1 split doubles shares and halves the price.",
              "Your total value doesn't change — you just hold more shares at a lower price each.",
            ],
            keyTakeaway: "A split changes the share count and price, not the value you hold.",
          },
          {
            title: "Reverse splits",
            body: [
              "A reverse split does the opposite: fewer shares at a higher price (e.g. 1-for-10).",
              "Companies sometimes use these to lift a low share price, which can be a caution sign worth investigating.",
            ],
          },
        ],
        questions: [
          {
            id: "mm-3-q1",
            type: "multiple_choice",
            prompt: "After a 2-for-1 stock split, the value of your position:",
            options: [
              "Doubles",
              "Halves",
              "Stays about the same",
              "Goes to zero",
            ],
            answer: 2,
            explanation: "You get twice the shares at half the price — total value is roughly unchanged.",
          },
          {
            id: "mm-3-q2",
            type: "true_false",
            prompt: "A reverse split reduces the number of shares and raises the price per share.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Reverse splits consolidate shares into fewer, higher-priced ones.",
          },
        ],
      },
      {
        id: "mm-4",
        title: "Buybacks and dividends",
        subtitle: "How companies return cash",
        minutes: 5,
        xp: 30,
        slides: [
          {
            title: "Two ways to return cash",
            body: [
              "Companies return profits to shareholders two main ways: paying dividends, or buying back their own shares.",
              "A buyback reduces share count, which can lift earnings per share and, often, the price per share.",
            ],
            keyTakeaway: "Dividends pay you directly; buybacks increase each remaining share's slice.",
          },
          {
            title: "Trade-offs",
            body: [
              "Dividends give immediate cash but are taxable when received in a taxable account.",
              "Buybacks are more tax-efficient for many investors but only help if shares are bought at reasonable prices.",
            ],
          },
        ],
        questions: [
          {
            id: "mm-4-q1",
            type: "multiple_choice",
            prompt: "A share buyback generally:",
            options: [
              "Increases the number of shares outstanding",
              "Reduces shares outstanding, raising earnings per share",
              "Pays you a dividend",
              "Has no effect on the company",
            ],
            answer: 1,
            explanation: "Buybacks shrink the share count, boosting per-share metrics.",
          },
          {
            id: "mm-4-q2",
            type: "true_false",
            prompt: "Dividends and buybacks are both ways to return cash to shareholders.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Both return capital; they just do it in different ways.",
          },
        ],
      },
      {
        id: "mm-5",
        title: "DRIPs",
        subtitle: "Reinvesting dividends automatically",
        minutes: 4,
        xp: 30,
        slides: [
          {
            title: "Dividend reinvestment",
            body: [
              "A DRIP (dividend reinvestment plan) automatically uses your dividends to buy more shares, often fractional ones.",
              "This keeps your money compounding instead of sitting as idle cash.",
            ],
            keyTakeaway: "DRIPs turn dividends into more shares automatically, fueling compounding.",
          },
        ],
        questions: [
          {
            id: "mm-5-q1",
            type: "multiple_choice",
            prompt: "A DRIP automatically:",
            options: [
              "Sells your shares",
              "Reinvests dividends into more shares",
              "Pays dividends as cash only",
              "Avoids all taxes",
            ],
            answer: 1,
            explanation: "DRIPs reinvest dividends to buy additional (often fractional) shares.",
          },
          {
            id: "mm-5-q2",
            type: "true_false",
            prompt: "Reinvesting dividends can accelerate compounding.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Reinvested dividends buy more shares that themselves earn returns.",
          },
        ],
      },
      {
        id: "mm-6",
        title: "IPOs",
        subtitle: "How companies go public",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Going public",
            body: [
              "An IPO (initial public offering) is when a private company first sells shares to the public and lists on an exchange.",
              "It raises money for the company and lets early investors and employees sell some shares.",
            ],
            keyTakeaway: "An IPO is a company's debut on the public market.",
          },
          {
            title: "Why IPOs are risky",
            body: [
              "New listings can be volatile: limited public history, hype, and lock-up periods that end and unleash selling.",
              "Many investors wait a few quarters for the dust to settle before buying.",
            ],
          },
        ],
        questions: [
          {
            id: "mm-6-q1",
            type: "multiple_choice",
            prompt: "An IPO is:",
            options: [
              "A company buying back stock",
              "A private company first selling shares to the public",
              "A type of dividend",
              "A bond offering",
            ],
            answer: 1,
            explanation: "An IPO is a company's first public sale of shares.",
          },
          {
            id: "mm-6-q2",
            type: "true_false",
            prompt: "Newly public stocks tend to be less volatile than established ones.",
            options: ["True", "False"],
            answer: 1,
            explanation: "IPOs are often more volatile due to hype, thin history, and lock-up expirations.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 15. MARGIN & SHORT SELLING
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "margin-and-shorting",
    title: "Margin & Short Selling",
    description: "Borrowing to invest and betting against stocks — the mechanics and the outsized risks.",
    level: "Advanced",
    icon: "⚖️",
    color: "#ff8a80",
    lessons: [
      {
        id: "ms-1",
        title: "What is margin?",
        subtitle: "Investing with borrowed money",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "Borrowing from your broker",
            body: [
              "A margin account lets you borrow money from your broker to buy more than your cash alone allows.",
              "This is leverage: it magnifies both gains AND losses.",
            ],
            keyTakeaway: "Margin amplifies returns in both directions — bigger wins and bigger losses.",
          },
          {
            title: "The cost of borrowing",
            body: [
              "You pay interest on borrowed funds, which eats into returns the longer you hold.",
              "If your investments fall, you still owe the full borrowed amount plus interest.",
            ],
          },
        ],
        questions: [
          {
            id: "ms-1-q1",
            type: "multiple_choice",
            prompt: "Buying on margin means:",
            options: [
              "Using only your own cash",
              "Borrowing from your broker to invest more",
              "Avoiding all risk",
              "Buying bonds",
            ],
            answer: 1,
            explanation: "Margin is borrowing from the broker to increase buying power — leverage.",
          },
          {
            id: "ms-1-q2",
            type: "true_false",
            prompt: "Leverage magnifies only your gains, never your losses.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Leverage cuts both ways — losses are magnified just as much as gains.",
          },
        ],
      },
      {
        id: "ms-2",
        title: "Margin calls",
        subtitle: "When the broker wants its money",
        minutes: 6,
        xp: 45,
        slides: [
          {
            title: "Maintenance requirements",
            body: [
              "Your account must keep a minimum equity level. If losses push you below it, you get a margin call.",
              "A margin call demands you add cash or sell assets to restore the minimum.",
            ],
            keyTakeaway: "A margin call forces you to add funds or sell — often at the worst possible time.",
          },
          {
            title: "Forced liquidation",
            body: [
              "If you don't meet a margin call, the broker can sell your positions for you, without asking, to cover the loan.",
              "This can lock in losses at the bottom of a decline.",
            ],
          },
        ],
        questions: [
          {
            id: "ms-2-q1",
            type: "multiple_choice",
            prompt: "A margin call happens when:",
            options: [
              "Your account equity falls below the required minimum",
              "You make a profit",
              "You pay off a dividend",
              "The market closes",
            ],
            answer: 0,
            explanation: "Falling below the maintenance requirement triggers a margin call.",
          },
          {
            id: "ms-2-q2",
            type: "true_false",
            prompt: "If you ignore a margin call, the broker can sell your positions without permission.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Brokers can force-liquidate positions to cover the loan.",
          },
        ],
      },
      {
        id: "ms-3",
        title: "Short selling",
        subtitle: "Profiting when prices fall",
        minutes: 6,
        xp: 45,
        slides: [
          {
            title: "Selling what you don't own",
            body: [
              "To short a stock, you borrow shares and sell them, hoping to buy them back cheaper later and pocket the difference.",
              "You profit if the price falls, and lose if it rises.",
            ],
            keyTakeaway: "Short selling is a bet that a price will fall.",
          },
          {
            title: "Unlimited loss potential",
            body: [
              "A stock can only fall to zero (capped gain for a short), but it can rise infinitely — so a short's losses are theoretically unlimited.",
              "A sharp rise can force shorts to buy back fast, fueling a 'short squeeze'.",
            ],
            keyTakeaway: "Shorting has capped gains but potentially unlimited losses.",
          },
        ],
        questions: [
          {
            id: "ms-3-q1",
            type: "multiple_choice",
            prompt: "A short seller profits when the stock:",
            options: ["Rises", "Falls", "Pays a dividend", "Splits"],
            answer: 1,
            explanation: "Shorts sell borrowed shares hoping to rebuy them lower.",
          },
          {
            id: "ms-3-q2",
            type: "multiple_choice",
            prompt: "The maximum loss on a short position is:",
            options: [
              "Limited to your initial amount",
              "Theoretically unlimited, since a stock can rise without limit",
              "Always zero",
              "The dividend",
            ],
            answer: 1,
            explanation: "Because a price can rise infinitely, short losses are theoretically unlimited.",
          },
          {
            id: "ms-3-q3",
            type: "true_false",
            prompt: "A 'short squeeze' is when a rising price forces short sellers to buy back, pushing the price higher.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Forced buying to cover shorts can accelerate a price spike.",
          },
        ],
      },
      {
        id: "ms-4",
        title: "The Pattern Day Trader rule",
        subtitle: "Rules for frequent traders",
        minutes: 5,
        xp: 40,
        slides: [
          {
            title: "What counts as a day trade",
            body: [
              "A day trade is buying and selling the same security on the same day.",
              "In the US, making 4+ day trades in 5 business days in a margin account flags you as a Pattern Day Trader (PDT).",
            ],
            keyTakeaway: "Frequent same-day round trips can trigger PDT status.",
          },
          {
            title: "The $25,000 minimum",
            body: [
              "PDT accounts must maintain at least $25,000 in equity to keep day trading.",
              "The rule exists because rapid trading is high-risk; it's a guardrail, not a strategy endorsement.",
            ],
          },
        ],
        questions: [
          {
            id: "ms-4-q1",
            type: "multiple_choice",
            prompt: "A pattern day trader in the US must maintain a minimum equity of:",
            options: ["$2,000", "$10,000", "$25,000", "$100,000"],
            answer: 2,
            explanation: "The PDT rule requires at least $25,000 in the margin account.",
          },
          {
            id: "ms-4-q2",
            type: "true_false",
            prompt: "A day trade means buying and selling the same security on the same day.",
            options: ["True", "False"],
            answer: 0,
            explanation: "That round trip within a single day is the definition of a day trade.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 16. DEEPER FUNDAMENTALS
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "deeper-fundamentals",
    title: "Deeper Fundamentals",
    description: "Cash flow, returns on capital, and debt ratios — reading a company beyond the basics.",
    level: "Advanced",
    icon: "🔬",
    color: "#b39ddb",
    lessons: [
      {
        id: "df-1",
        title: "The cash flow statement",
        subtitle: "Following the actual cash",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "The third statement",
            body: [
              "Beyond the income statement and balance sheet, the cash flow statement tracks the real cash moving in and out.",
              "It's split into operating, investing, and financing activities.",
            ],
            keyTakeaway: "Profit is an opinion; cash flow is a fact. This statement shows the cash.",
          },
          {
            title: "Free cash flow",
            body: [
              "Free cash flow is operating cash flow minus capital spending — the cash a business truly generates and can return to owners.",
              "Consistent, growing free cash flow is a hallmark of a healthy company.",
            ],
          },
        ],
        questions: [
          {
            id: "df-1-q1",
            type: "multiple_choice",
            prompt: "The cash flow statement is divided into:",
            options: [
              "Operating, investing, and financing activities",
              "Assets, liabilities, and equity",
              "Revenue and expenses",
              "Bulls and bears",
            ],
            answer: 0,
            explanation: "Those three sections make up the cash flow statement.",
          },
          {
            id: "df-1-q2",
            type: "multiple_choice",
            prompt: "Free cash flow is roughly:",
            options: [
              "Revenue minus taxes",
              "Operating cash flow minus capital expenditures",
              "Net income plus dividends",
              "Assets minus liabilities",
            ],
            answer: 1,
            explanation: "FCF = operating cash flow − capital spending.",
          },
        ],
      },
      {
        id: "df-2",
        title: "Return on capital",
        subtitle: "How well management invests",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "ROE and ROIC",
            body: [
              "Return on equity (ROE) measures profit generated per dollar of shareholder equity.",
              "Return on invested capital (ROIC) measures profit per dollar of all capital (equity + debt) put to work.",
            ],
            keyTakeaway: "These ratios show how efficiently a company turns capital into profit.",
          },
          {
            title: "Quality signal",
            body: [
              "Consistently high ROIC (above the company's cost of capital) suggests a durable, well-run business.",
              "But watch for high ROE driven mostly by heavy debt rather than real efficiency.",
            ],
          },
        ],
        questions: [
          {
            id: "df-2-q1",
            type: "multiple_choice",
            prompt: "Return on equity (ROE) measures:",
            options: [
              "Profit per dollar of shareholder equity",
              "Total revenue",
              "The dividend yield",
              "The share price",
            ],
            answer: 0,
            explanation: "ROE is net income relative to shareholder equity.",
          },
          {
            id: "df-2-q2",
            type: "true_false",
            prompt: "A high ROE driven mostly by heavy borrowing can be misleading.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Leverage can inflate ROE without reflecting true operating efficiency.",
          },
        ],
      },
      {
        id: "df-3",
        title: "Debt and liquidity ratios",
        subtitle: "Can the company pay its bills?",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "Leverage ratios",
            body: [
              "Debt-to-equity compares what a company owes to what shareholders own. Higher means more leverage and risk.",
              "Interest coverage (earnings ÷ interest expense) shows how comfortably it can service its debt.",
            ],
            keyTakeaway: "Leverage ratios reveal how much risk a company's borrowing adds.",
          },
          {
            title: "Liquidity ratios",
            body: [
              "The current ratio (current assets ÷ current liabilities) gauges short-term ability to pay bills.",
              "Below 1 can signal a cash crunch; very high can signal idle, underused assets.",
            ],
          },
        ],
        questions: [
          {
            id: "df-3-q1",
            type: "multiple_choice",
            prompt: "A high debt-to-equity ratio generally indicates:",
            options: ["Less risk", "More leverage and risk", "Higher dividends", "A stock split"],
            answer: 1,
            explanation: "More debt relative to equity means more financial leverage and risk.",
          },
          {
            id: "df-3-q2",
            type: "multiple_choice",
            prompt: "Interest coverage tells you:",
            options: [
              "How comfortably a company can pay interest on its debt",
              "The dividend per share",
              "The P/E ratio",
              "The market cap",
            ],
            answer: 0,
            explanation: "It's earnings relative to interest expense — debt-servicing comfort.",
          },
          {
            id: "df-3-q3",
            type: "true_false",
            prompt: "A current ratio below 1 can signal short-term liquidity trouble.",
            options: ["True", "False"],
            answer: 0,
            explanation: "It means current liabilities exceed current assets — a potential cash crunch.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 17. MACRO & THE ECONOMY
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "macro-economy",
    title: "Macro & the Economy",
    description: "The big forces: interest rates, inflation, the business cycle, and recessions.",
    level: "Intermediate",
    icon: "🌐",
    color: "#4db6ac",
    lessons: [
      {
        id: "ma-1",
        title: "Interest rates and the Fed",
        subtitle: "The price of money",
        minutes: 6,
        xp: 35,
        slides: [
          {
            title: "The central bank's lever",
            body: [
              "A central bank (in the US, the Federal Reserve) sets a key interest rate that ripples through the whole economy.",
              "Raising rates cools borrowing and spending; cutting rates stimulates them.",
            ],
            keyTakeaway: "Interest rates are the economy's main throttle — they move nearly everything.",
          },
          {
            title: "Why markets watch rates",
            body: [
              "Higher rates make borrowing costlier and make safe assets (like bonds) more attractive vs. stocks.",
              "Growth stocks, valued on far-future profits, are especially sensitive to rate changes.",
            ],
          },
        ],
        questions: [
          {
            id: "ma-1-q1",
            type: "multiple_choice",
            prompt: "When a central bank raises interest rates, it generally aims to:",
            options: [
              "Speed up borrowing and spending",
              "Cool down borrowing and spending",
              "Pay dividends",
              "Split stocks",
            ],
            answer: 1,
            explanation: "Higher rates make borrowing costlier, slowing spending and inflation.",
          },
          {
            id: "ma-1-q2",
            type: "true_false",
            prompt: "Rising rates tend to pressure high-growth stocks more than average.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Growth stocks rely on far-future profits, which are discounted harder as rates rise.",
          },
        ],
      },
      {
        id: "ma-2",
        title: "Inflation",
        subtitle: "The erosion of purchasing power",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Prices rising over time",
            body: [
              "Inflation is the general rise in prices, which reduces what each dollar can buy.",
              "Moderate inflation is normal; high inflation erodes savings and unsettles markets.",
            ],
            keyTakeaway: "Inflation is why cash loses value over time and why investing matters.",
          },
          {
            title: "Inflation and your investments",
            body: [
              "Stocks have historically outpaced inflation over long periods, though not always in the short run.",
              "Cash and low-yield bonds can lose real value when inflation runs hot.",
            ],
          },
        ],
        questions: [
          {
            id: "ma-2-q1",
            type: "multiple_choice",
            prompt: "Inflation refers to:",
            options: [
              "The general rise in prices over time",
              "A stock split",
              "A type of dividend",
              "Falling interest rates",
            ],
            answer: 0,
            explanation: "Inflation is a broad increase in prices that erodes purchasing power.",
          },
          {
            id: "ma-2-q2",
            type: "true_false",
            prompt: "Holding only cash protects you fully from inflation.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Cash loses real value as inflation rises; it doesn't protect purchasing power.",
          },
        ],
      },
      {
        id: "ma-3",
        title: "The business cycle",
        subtitle: "Expansion and contraction",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Economies move in cycles",
            body: [
              "Economies expand (growth, hiring, rising spending) and eventually contract, then recover — the business cycle.",
              "A recession is a significant, broad decline in activity, often defined loosely as two quarters of shrinking output.",
            ],
            keyTakeaway: "Growth and downturns are recurring phases, not permanent states.",
          },
          {
            title: "Investing across the cycle",
            body: [
              "Different sectors tend to lead at different phases — defensives hold up in downturns, cyclicals shine in recoveries.",
              "Timing the cycle precisely is very hard; a diversified, long-term plan rides through it.",
            ],
          },
        ],
        questions: [
          {
            id: "ma-3-q1",
            type: "multiple_choice",
            prompt: "A recession is best described as:",
            options: [
              "A single bad trading day",
              "A significant, broad decline in economic activity",
              "A period of rising stock prices",
              "A type of tax",
            ],
            answer: 1,
            explanation: "A recession is a broad, sustained contraction in economic activity.",
          },
          {
            id: "ma-3-q2",
            type: "true_false",
            prompt: "Precisely timing the business cycle is easy and reliable.",
            options: ["True", "False"],
            answer: 1,
            explanation: "Cycle timing is notoriously difficult; diversification and time are more reliable.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 18. BEHAVIORAL FINANCE
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "behavioral-finance",
    title: "Behavioral Finance",
    description: "The mental biases that quietly sabotage returns — and how to counter them.",
    level: "Intermediate",
    icon: "🧩",
    color: "#f0a868",
    lessons: [
      {
        id: "bf-1",
        title: "Recency & anchoring",
        subtitle: "Overweighting the wrong info",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Recency bias",
            body: [
              "Recency bias is assuming recent trends will continue — chasing what's hot or fleeing what just fell.",
              "It leads to buying high in booms and selling low in busts.",
            ],
            keyTakeaway: "The recent past feels predictive but often isn't. Beware chasing trends.",
          },
          {
            title: "Anchoring",
            body: [
              "Anchoring is fixating on a reference number — like the price you paid — and judging everything against it.",
              "'I'll sell when it gets back to what I paid' is anchoring, not analysis.",
            ],
          },
        ],
        questions: [
          {
            id: "bf-1-q1",
            type: "multiple_choice",
            prompt: "Recency bias leads investors to:",
            options: [
              "Assume recent trends will continue",
              "Ignore all news",
              "Always buy low",
              "Diversify perfectly",
            ],
            answer: 0,
            explanation: "Recency bias overweights recent events, fueling trend-chasing.",
          },
          {
            id: "bf-1-q2",
            type: "true_false",
            prompt: "Refusing to sell until a stock returns to your purchase price is an example of anchoring.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Fixating on your entry price is a classic anchor that clouds judgment.",
          },
        ],
      },
      {
        id: "bf-2",
        title: "Sunk cost & confirmation",
        subtitle: "Two costly traps",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "The sunk-cost fallacy",
            body: [
              "The sunk-cost fallacy is holding a losing investment because of what you've already put in, rather than its future prospects.",
              "Past losses are gone; the only question is whether it's the best home for your money now.",
            ],
            keyTakeaway: "Decide based on the future, not on money already spent.",
          },
          {
            title: "Confirmation bias",
            body: [
              "Confirmation bias is seeking out information that agrees with you and dismissing what doesn't.",
              "Deliberately looking for the bear case on your own holdings is a healthy antidote.",
            ],
          },
        ],
        questions: [
          {
            id: "bf-2-q1",
            type: "multiple_choice",
            prompt: "The sunk-cost fallacy is:",
            options: [
              "Holding a loser because of money already invested",
              "Selling winners too early",
              "Diversifying broadly",
              "Reinvesting dividends",
            ],
            answer: 0,
            explanation: "It's letting past, unrecoverable costs drive current decisions.",
          },
          {
            id: "bf-2-q2",
            type: "true_false",
            prompt: "Seeking out views that challenge your own helps counter confirmation bias.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Actively considering opposing evidence is the antidote to confirmation bias.",
          },
        ],
      },
      {
        id: "bf-3",
        title: "Building better habits",
        subtitle: "Systems beat willpower",
        minutes: 5,
        xp: 40,
        slides: [
          {
            title: "Rules over impulses",
            body: [
              "Automating contributions and rebalancing removes emotion from the moments that matter most.",
              "A written investment policy — your goals, allocation, and rules — keeps you steady when markets aren't.",
            ],
            keyTakeaway: "Good systems make good behavior the default, not a daily battle.",
          },
        ],
        questions: [
          {
            id: "bf-3-q1",
            type: "multiple_choice",
            prompt: "A reliable way to reduce emotional investing mistakes is to:",
            options: [
              "Watch prices all day",
              "Automate contributions and follow a written plan",
              "Trade on every headline",
              "Avoid diversification",
            ],
            answer: 1,
            explanation: "Automation and a written plan make disciplined behavior the default.",
          },
          {
            id: "bf-3-q2",
            type: "true_false",
            prompt: "A written investment plan helps you stay steady during volatility.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Rules set in calm times guide you through turbulent ones.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 19. ACCOUNT & TAX STRATEGY
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "account-tax-strategy",
    title: "Account & Tax Strategy",
    description: "Which account to use first, and how different income is taxed.",
    level: "Advanced",
    icon: "🗂️",
    color: "#9fd8a0",
    lessons: [
      {
        id: "at-1",
        title: "TFSA vs. RRSP: which first?",
        subtitle: "A practical framework",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "Different tax timing",
            body: [
              "A TFSA is funded with after-tax money and grows/withdraws tax-free. An RRSP gives a deduction now but is taxed on withdrawal.",
              "Roughly: RRSP tends to win if your tax rate will be lower in retirement; TFSA offers flexibility and tax-free growth regardless.",
            ],
            keyTakeaway: "RRSP defers tax to (ideally lower) future rates; TFSA is tax-free and flexible.",
          },
          {
            title: "A common priority",
            body: [
              "Many people first capture any employer match, then use a TFSA for flexibility, then an RRSP for higher incomes.",
              "The right order depends on your income now vs. expected in retirement.",
            ],
          },
        ],
        questions: [
          {
            id: "at-1-q1",
            type: "multiple_choice",
            prompt: "An RRSP is generally most advantageous when:",
            options: [
              "Your tax rate will be lower in retirement than today",
              "You never plan to retire",
              "You want to pay more tax now",
              "You have no income",
            ],
            answer: 0,
            explanation: "Deducting at a high rate now and withdrawing at a lower rate later is the RRSP win.",
          },
          {
            id: "at-1-q2",
            type: "true_false",
            prompt: "A TFSA's growth and withdrawals are tax-free.",
            options: ["True", "False"],
            answer: 0,
            explanation: "TFSA money is after-tax going in, then grows and comes out tax-free.",
          },
        ],
      },
      {
        id: "at-2",
        title: "How investment income is taxed",
        subtitle: "Not all gains are equal",
        minutes: 6,
        xp: 40,
        slides: [
          {
            title: "Capital gains vs. dividends vs. interest",
            body: [
              "In taxable accounts, capital gains and many dividends often get more favorable treatment than ordinary interest income.",
              "Interest (from bonds/savings) is typically taxed at your full rate, making it less tax-efficient.",
            ],
            keyTakeaway: "Interest is usually taxed hardest; capital gains and qualified dividends are often lighter.",
          },
          {
            title: "Why it guides placement",
            body: [
              "This is the logic behind asset location: hold tax-inefficient, interest-bearing assets in sheltered accounts.",
              "Keep tax-efficient growth assets where their favorable treatment isn't wasted.",
            ],
          },
        ],
        questions: [
          {
            id: "at-2-q1",
            type: "multiple_choice",
            prompt: "Which is typically the LEAST tax-efficient in a taxable account?",
            options: ["Long-term capital gains", "Qualified dividends", "Ordinary interest income", "Unrealized gains"],
            answer: 2,
            explanation: "Interest income is usually taxed at your full ordinary rate.",
          },
          {
            id: "at-2-q2",
            type: "true_false",
            prompt: "Tax treatment of income is a key reason to think about which account holds which asset.",
            options: ["True", "False"],
            answer: 0,
            explanation: "That's exactly the idea behind asset location.",
          },
        ],
      },
      {
        id: "at-3",
        title: "Contribution room & limits",
        subtitle: "Use it, don't abuse it",
        minutes: 5,
        xp: 40,
        slides: [
          {
            title: "Registered accounts have caps",
            body: [
              "Tax-advantaged accounts have annual (and cumulative) contribution limits. Unused room often carries forward.",
              "Over-contributing can trigger penalties, so track your room.",
            ],
            keyTakeaway: "Know your contribution room — the tax perks come with limits.",
          },
        ],
        questions: [
          {
            id: "at-3-q1",
            type: "true_false",
            prompt: "Tax-advantaged accounts typically have contribution limits.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Registered accounts cap how much you can contribute, often with carry-forward room.",
          },
          {
            id: "at-3-q2",
            type: "multiple_choice",
            prompt: "Over-contributing to a registered account can result in:",
            options: ["A bonus", "Penalties", "Higher returns", "A stock split"],
            answer: 1,
            explanation: "Exceeding your limit can trigger penalty taxes.",
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // 20. MANAGED & THEMATIC INVESTING
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "managed-thematic",
    title: "Managed & Thematic",
    description: "Hands-off options, values-based investing, and holding foreign assets.",
    level: "Intermediate",
    icon: "🧭",
    color: "#c5a3ff",
    lessons: [
      {
        id: "mt-1",
        title: "Robo-advisors & managed portfolios",
        subtitle: "Investing on autopilot",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Automated portfolios",
            body: [
              "A robo-advisor builds and manages a diversified portfolio for you based on your goals and risk tolerance, automatically rebalancing.",
              "It's a low-effort, low-cost option for people who don't want to pick investments themselves.",
            ],
            keyTakeaway: "Robo-advisors automate diversification and rebalancing for a small fee.",
          },
          {
            title: "The trade-off",
            body: [
              "You give up hands-on control and pay a management fee, but gain simplicity and discipline.",
              "For many beginners, that's a worthwhile trade.",
            ],
          },
        ],
        questions: [
          {
            id: "mt-1-q1",
            type: "multiple_choice",
            prompt: "A robo-advisor primarily:",
            options: [
              "Guarantees profits",
              "Automatically builds and rebalances a diversified portfolio",
              "Only buys crypto",
              "Times the market perfectly",
            ],
            answer: 1,
            explanation: "It automates portfolio construction and rebalancing to your risk profile.",
          },
          {
            id: "mt-1-q2",
            type: "true_false",
            prompt: "Robo-advisors trade some control for simplicity and discipline.",
            options: ["True", "False"],
            answer: 0,
            explanation: "You hand off decisions and pay a fee in exchange for a hands-off experience.",
          },
        ],
      },
      {
        id: "mt-2",
        title: "ESG & thematic investing",
        subtitle: "Investing with a lens",
        minutes: 5,
        xp: 35,
        slides: [
          {
            title: "Aligning with values or trends",
            body: [
              "ESG investing screens for environmental, social, and governance factors. Thematic investing targets a trend, like clean energy or AI.",
              "Both narrow your universe, which can mean more concentration and different risk than a broad index.",
            ],
            keyTakeaway: "Themed investing expresses a view but usually reduces diversification.",
          },
          {
            title: "Watch fees and overlap",
            body: [
              "Thematic funds often charge higher fees and may overlap heavily with what you already own.",
              "Treat them as a satellite around a diversified core, not the whole portfolio.",
            ],
          },
        ],
        questions: [
          {
            id: "mt-2-q1",
            type: "multiple_choice",
            prompt: "A thematic fund (e.g. clean energy) tends to be:",
            options: [
              "More diversified than a broad index",
              "More concentrated, with higher fees",
              "Risk-free",
              "A type of bond",
            ],
            answer: 1,
            explanation: "Narrowing to a theme concentrates risk and often costs more.",
          },
          {
            id: "mt-2-q2",
            type: "true_false",
            prompt: "Thematic funds are best used as a satellite around a diversified core.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Keeping them small limits the concentration risk they add.",
          },
        ],
      },
      {
        id: "mt-3",
        title: "Currency & foreign stocks",
        subtitle: "The hidden FX factor",
        minutes: 5,
        xp: 40,
        slides: [
          {
            title: "Two bets in one",
            body: [
              "When you buy a foreign stock, your return depends on both the stock's performance AND the exchange rate between currencies.",
              "A rising stock can still lose you money if its currency falls against yours.",
            ],
            keyTakeaway: "Foreign holdings carry currency risk on top of the investment itself.",
          },
          {
            title: "Hedged vs. unhedged",
            body: [
              "Some funds offer 'currency-hedged' versions that neutralize FX swings, usually for a small extra cost.",
              "Unhedged exposure adds diversification but also adds currency volatility.",
            ],
          },
        ],
        questions: [
          {
            id: "mt-3-q1",
            type: "multiple_choice",
            prompt: "Buying a foreign stock exposes you to:",
            options: [
              "Only the stock's performance",
              "The stock's performance and the exchange rate",
              "Neither",
              "Only currency, never the stock",
            ],
            answer: 1,
            explanation: "Your return combines the stock's move and the currency move.",
          },
          {
            id: "mt-3-q2",
            type: "true_false",
            prompt: "A currency-hedged fund aims to neutralize exchange-rate swings.",
            options: ["True", "False"],
            answer: 0,
            explanation: "Hedging removes most of the FX impact, usually for a small cost.",
          },
        ],
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export const COURSE_MAP: Record<string, Course> = Object.fromEntries(
  COURSES.map((c) => [c.id, c])
);

export interface LessonLocation {
  course: Course;
  lesson: Lesson;
  index: number; // index within the course
}

const LESSON_INDEX: Record<string, LessonLocation> = {};
for (const course of COURSES) {
  course.lessons.forEach((lesson, index) => {
    LESSON_INDEX[lesson.id] = { course, lesson, index };
  });
}

export function findLesson(lessonId: string): LessonLocation | undefined {
  return LESSON_INDEX[lessonId];
}

/** Ordered flat list of all lessons across all courses. */
export function allLessonsInOrder(): Array<{ courseId: string; lessonId: string }> {
  const out: Array<{ courseId: string; lessonId: string }> = [];
  for (const course of COURSES) {
    for (const lesson of course.lessons) {
      out.push({ courseId: course.id, lessonId: lesson.id });
    }
  }
  return out;
}

export const TOTAL_LESSONS = allLessonsInOrder().length;
