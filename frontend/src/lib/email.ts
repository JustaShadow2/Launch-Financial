// Lightweight client-side email checks for inline signup feedback. The backend
// does the authoritative validation; this just gives quick, friendly hints.

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "yopmail.com", "throwawaymail.com", "trashmail.com",
  "sharklasers.com", "getnada.com", "maildrop.cc", "1secmail.com",
]);

const COMMON = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com"];

function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[a.length][b.length];
}

export interface EmailHint {
  ok: boolean;
  message?: string;
  suggestion?: string;
}

/** Returns a hint for a possibly-incomplete email. Empty input is treated as "no hint yet". */
export function checkEmail(raw: string): EmailHint {
  const email = raw.trim().toLowerCase();
  if (!email) return { ok: false };
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email address" };

  const [local, domain] = email.split("@");
  if (DISPOSABLE.has(domain)) {
    return { ok: false, message: "Use a permanent email, not a disposable one" };
  }
  for (const known of COMMON) {
    const d = editDistance(domain, known);
    if (d > 0 && d <= 2) {
      return { ok: false, message: `Did you mean ${local}@${known}?`, suggestion: `${local}@${known}` };
    }
  }
  return { ok: true };
}
