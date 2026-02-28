/**
 * Resend email client + sendResumeEmail helper.
 *
 * Requires env vars:
 *   RESEND_API_KEY     — your Resend API key
 *   RESEND_FROM_EMAIL  — verified sender address (e.g. "noreply@yourdomain.com")
 *                        Defaults to "onboarding@resend.dev" for local testing,
 *                        which only delivers to your Resend account's verified email.
 */

import { Resend } from "resend";

// Singleton — reused across requests in the same lambda warm start
const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export async function sendResumeEmail(
  toEmail: string,
  pdfBytes: Uint8Array,
  score: number,
  summary: string,
): Promise<void> {
  // Score label for the email
  const scoreLabel =
    score >= 80 ? "Strong match" :
    score >= 60 ? "Good match" :
    score >= 40 ? "Partial match" : "Weak match";

  const scoreColor =
    score >= 80 ? "#10b981" :
    score >= 60 ? "#f59e0b" :
    score >= 40 ? "#f97316" : "#ef4444";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: "Your tailored resume is ready",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
          <tr><td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:32px 36px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:32px;height:32px;background:rgba(255,255,255,.15);border-radius:8px;text-align:center;vertical-align:middle;font-size:16px;padding:0 8px;">&#10003;</td>
                      <td style="padding-left:10px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">ResumeMatcher</td>
                    </tr>
                  </table>
                  <p style="color:rgba(255,255,255,.85);margin:16px 0 0;font-size:15px;">Your tailored resume is attached!</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px 36px;">
                  <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">
                    Claude has rewritten your resume to better match the job description. Open the attached PDF to review it before submitting your application.
                  </p>
                  <!-- Score card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ede9fe;border-radius:10px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:36px;font-weight:800;color:${scoreColor};line-height:1;padding-right:16px;">${score}</td>
                            <td style="vertical-align:middle;">
                              <div style="font-size:13px;font-weight:600;color:${scoreColor};">${scoreLabel}</div>
                              <div style="font-size:11px;color:#9ca3af;margin-top:2px;">out of 100</div>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:14px 0 0;font-size:13px;color:#4b5563;line-height:1.6;">${summary}</p>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                    Good luck with your application! Run another analysis any time at <a href="https://resumematcher.app" style="color:#6d28d9;text-decoration:none;">ResumeMatcher</a>.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:16px 36px;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;">ResumeMatcher &middot; Built with Claude AI &middot; 5 analyses / day &middot; free</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: "tailored-resume.pdf",
        content: Buffer.from(pdfBytes).toString("base64"),
      },
    ],
  });
}
