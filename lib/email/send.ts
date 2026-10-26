import "server-only";
import { Resend } from "resend";

let resend: Resend | null | undefined;

function client(): Resend | null {
  if (resend === undefined) resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  return resend;
}

/** Sends an email via Resend. Returns false (and logs) when Resend is not configured or fails. */
export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; replyTo?: string }): Promise<boolean> {
  const r = client();
  const from = process.env.EMAIL_FROM;
  if (!r || !from) {
    console.warn(`[email] Resend not configured – skipped "${msg.subject}"`);
    return false;
  }
  const { error } = await r.emails.send({ from, to: msg.to, subject: msg.subject, html: msg.html, replyTo: msg.replyTo });
  if (error) {
    console.error("[email] send failed:", error.message);
    return false;
  }
  return true;
}

export function internalRecipients(): string[] {
  return (process.env.EMAIL_INTERNAL_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
