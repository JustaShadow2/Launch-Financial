import { config } from "../lib/config";

/**
 * Minimal email sender for transactional messages (password-reset OTP).
 *
 * Uses Resend's HTTP API when RESEND_API_KEY is configured. If it isn't, the
 * message is logged to the server console instead — a dev fallback so the
 * forgot-password flow works end-to-end without email set up.
 */

export function emailConfigured(): boolean {
  return Boolean(config.resendApiKey);
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendViaResend({ to, subject, html, text }: SendArgs): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: config.emailFrom, to, subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend send failed (${res.status}): ${body}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] Resend request error:", e);
    return false;
  }
}

/**
 * Send a password-reset OTP. Returns true if delivered (or logged in dev).
 */
export async function sendPasswordResetCode(to: string, code: string): Promise<boolean> {
  const subject = `${config.appName} password reset code`;
  const text = `Your ${config.appName} password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0d1117">
      <h2 style="margin:0 0 8px">Reset your password</h2>
      <p style="color:#57606a;margin:0 0 20px">Use this code to reset your ${config.appName} password. It expires in 10 minutes.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f6f8fa;border-radius:10px;padding:16px;text-align:center">${code}</div>
      <p style="color:#8b949e;font-size:13px;margin:20px 0 0">If you didn't request this, you can safely ignore this email.</p>
    </div>`;

  if (!emailConfigured()) {
    // Dev fallback: make the code visible in server logs.
    console.log(
      `[email:DEV] No RESEND_API_KEY set. Password reset code for ${to}: ${code} (expires in 10 min)`
    );
    return true;
  }

  return sendViaResend({ to, subject, html, text });
}
