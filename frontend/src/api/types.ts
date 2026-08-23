export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Quote {
  symbol: string;
  name: string;
  type: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  source: "real" | "simulated";
  updatedAt: string;
}

export interface Position {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface AccountSummary {
  accountId: string;
  name: string;
  type: string;
  cashBalance: number;
  investmentsValue: number;
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  positions: Position[];
}

export interface Transaction {
  id: string;
  accountId: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "BUY" | "SELL";
  symbol?: string | null;
  quantity?: number | null;
  price?: number | null;
  amount: number;
  note?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: string;
  quantity: number;
  status: string;
  filledPrice?: number | null;
  createdAt: string;
}

export interface Candle {
  t: number;
  price: number;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  type: string;
  basePrice: number;
  volatility: number;
}

// ── Learning ────────────────────────────────────────────────────────────────

export type LessonStatus = "completed" | "current" | "locked";

export interface LessonView {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  xp: number;
  status: LessonStatus;
  correct?: number;
  total?: number;
}

export interface CourseView {
  id: string;
  title: string;
  description: string;
  level: string;
  icon: string;
  color: string;
  totalLessons: number;
  completedLessons: number;
  percent: number;
  lessons: LessonView[];
}

export interface LearnStats {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  completedLessons: number;
  totalLessons: number;
  dailyGoalMet: boolean;
  lastLessonDay: string | null;
}

export interface DailyLesson {
  courseId: string;
  courseTitle: string;
  courseIcon: string;
  lessonId: string;
  title: string;
  subtitle: string;
  minutes: number;
  xp: number;
}

export interface Slide {
  title: string;
  body: string[];
  keyTakeaway?: string;
}

export interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false";
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  xp: number;
  slides: Slide[];
  questions: QuizQuestion[];
}

export interface LessonContent {
  courseId: string;
  courseTitle: string;
  courseColor: string;
  lesson: Lesson;
  alreadyCompleted: boolean;
}

export interface CompleteResult {
  correct: number;
  total: number;
  passed: boolean;
  xpEarned: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    correctAnswer: number;
    explanation: string;
  }>;
  stats: LearnStats;
  firstCompletion: boolean;
}
