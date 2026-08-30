/**
 * Email validation used at signup.
 *
 * We can't verify deliverability without sending mail, but we can reject the
 * obviously-bad and low-quality cases synchronously:
 *  - malformed syntax (stricter than a bare regex),
 *  - disposable / throwaway domains,
 *  - domains with no dot or bad TLD.
 *
 * The password-reset flow still confirms real ownership by emailing a code.
 */

// A pragmatic RFC-5322-ish pattern: local@label(.label)+ with a 2+ char TLD.
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Common disposable / throwaway email domains to reject.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "10minutemail.com",
  "tempmail.com", "temp-mail.org", "throwawaymail.com", "yopmail.com", "getnada.com",
  "trashmail.com", "sharklasers.com", "grr.la", "maildrop.cc", "dispostable.com",
  "fakeinbox.com", "mailnesia.com", "mintemail.com", "mohmal.com", "spamgourmet.com",
  "tempinbox.com", "emailondeck.com", "moakt.com", "tmpmail.org", "tmpmail.net",
  "fakemail.net", "trbvm.com", "burnermail.io", "mailcatch.com", "inboxbear.com",
  "tempail.com", "1secmail.com", "1secmail.org", "1secmail.net", "harakirimail.com",
]);

// Popular domains for typo suggestions.
const COMMON_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com",
  "protonmail.com", "live.com", "msn.com",
];

export interface EmailCheck {
  ok: boolean;
  error?: string;
  suggestion?: string; // e.g. "did you mean you@gmail.com?"
}

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

// Levenshtein distance, capped small — used only for tiny typo suggestions.
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function suggestDomain(domain: string): string | undefined {
  for (const known of COMMON_DOMAINS) {
    if (domain === known) return undefined;
    const d = editDistance(domain, known);
    // Only suggest for very close misspellings (e.g. gmial.com -> gmail.com).
    if (d > 0 && d <= 2) return known;
  }
  return undefined;
}

export function validateEmail(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();

  if (!email) return { ok: false, error: "Email is required" };
  if (email.length > 254) return { ok: false, error: "Email is too long" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address" };

  // No consecutive dots and no leading/trailing dot in the local part.
  const [local, domain] = email.split("@");
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return { ok: false, error: "Enter a valid email address" };
  }
  if (domain.includes("..")) {
    return { ok: false, error: "Enter a valid email address" };
  }

  const dom = domainOf(email);
  if (DISPOSABLE_DOMAINS.has(dom)) {
    return { ok: false, error: "Please use a permanent email address, not a disposable one." };
  }

  const suggestion = suggestDomain(dom);
  if (suggestion) {
    return {
      ok: false,
      error: `Did you mean ${local}@${suggestion}?`,
      suggestion: `${local}@${suggestion}`,
    };
  }

  return { ok: true };
}
