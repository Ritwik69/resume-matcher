// POST /api/analyze
// Accepts: multipart/form-data with `resume` (PDF File) and `jd` (string)
// Returns: { score, matchedSkills, missingSkills, summary }
//
// Pipeline:
//  1. Validate form data
//  2. Auth check
//  3. Rate-limit (5/day per user)
//  4. Extract text from PDF
//  5. Two parallel Claude calls:
//       a. Analysis  → score, matched_skills, missing_skills, summary
//       b. Rewrite   → tailored resume text (structured with [SECTION] markers)
//  6. Build a PDF from the tailored resume text (pdf-lib)
//  7. Email the PDF to the user (Resend) — non-fatal
//  8. Persist analysis to DB — non-fatal
//  9. Update daily counter
// 10. Return the analysis result

import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { createServerClient } from "@/lib/supabase/server";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { buildResumePdf } from "@/lib/buildResumePdf";
import { sendResumeEmail } from "@/lib/resend";
import { clamp, normalizeText } from "@/lib/utils";
import type { ClaudeAnalysis, AnalyzeResult, Profile } from "@/types";

// pdf-parse requires the Node.js runtime (not Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB
const DAILY_LIMIT = 5;

// ── Claude prompt helpers ─────────────────────────────────────────────────────

/** Call Claude to score and analyse the resume against the JD. */
async function runAnalysis(resumeText: string, jdText: string): Promise<ClaudeAnalysis> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: `You are an expert technical recruiter and resume analyst.
Analyze the provided resume against the job description and return ONLY a valid JSON object.
No markdown, no code fences, no explanation — raw JSON only.

Required JSON shape:
{
  "score": <integer 0-100>,
  "matched_skills": [<skills present in both resume and JD>],
  "missing_skills": [<skills required by JD but absent from resume>],
  "summary": "<2-3 sentence tailored summary of the candidate's fit>"
}

Scoring guide:
- 80-100  Strong match — meets most or all key requirements
- 60-79   Good match — meets core requirements with minor gaps
- 40-59   Partial match — meets some requirements with notable gaps
- 0-39    Weak match — missing most key requirements

Rules:
- Use specific, concise skill names (e.g. "React", "TypeScript", "PostgreSQL", "Docker")
- Only include skills explicitly mentioned or clearly evidenced
- The summary must reference specific strengths and the most critical gaps
- score must be an integer`,
    messages: [
      { role: "user", content: `RESUME:\n${resumeText}\n\n---\n\nJOB DESCRIPTION:\n${jdText}` },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  // Strip accidental code fences (Claude occasionally wraps output)
  const jsonText = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const parsed = JSON.parse(jsonText) as ClaudeAnalysis;

  return {
    score: clamp(Math.round(Number(parsed.score)), 0, 100),
    matched_skills: Array.isArray(parsed.matched_skills) ? parsed.matched_skills : [],
    missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [],
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  };
}

/** Call Claude to rewrite and tailor the resume content for the given JD. */
async function runRewrite(resumeText: string, jdText: string, pages: 1 | 2): Promise<string> {
  const lengthGuidance = pages === 1
    ? `TARGET LENGTH: exactly 1 page.
- Include only the 2-3 most recent / relevant positions; omit older or less-relevant roles.
- Limit each position to 2-3 bullets max; keep every bullet under 15 words.
- Summary: 2 sentences only.
- Skills: one combined line per category; omit rarely-relevant tools.`
    : `TARGET LENGTH: up to 2 pages.
- Include all positions from the original resume.
- Up to 4-5 bullets per position; quantify results wherever the original resume supports it.
- Summary: 3 sentences.
- Skills: full categorised list.`;

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: pages === 1 ? 1800 : 3000,
    system: `You are an expert resume writer and career coach.
Rewrite and tailor the provided resume so it is optimally positioned for the given job description.
Return ONLY the resume content using the exact section markers shown below — no preamble, no commentary.

${lengthGuidance}

Use this format verbatim:

[NAME]
Full Name
Target Job Title

[CONTACT]
email@example.com | (555) 000-0000 | City, State | linkedin.com/in/handle

[SUMMARY]
Two to three sentences positioning the candidate specifically for this role. Reference their strongest matching qualifications and how they address the job's core needs.

[EXPERIENCE]
Job Title - Company Name | Start Year - End Year
- Accomplishment bullet emphasizing skills relevant to this JD
- Another bullet; quantify results where the original resume supports it

(repeat for every position in the original resume, subject to the TARGET LENGTH rule above)

[EDUCATION]
Degree - Institution | Year

[SKILLS]
Languages: list, of, skills
Frameworks: list, of, skills
Tools: list, of, skills

Rules:
- Preserve all factual information; never invent experience or credentials
- Reorder and reword bullets to surface JD-relevant skills first
- Use strong action verbs; match terminology used in the job description
- Use only standard ASCII characters (no smart quotes, em dashes, or bullet symbols)
- Keep bullets concise — no more than 18 words each`,
    messages: [
      { role: "user", content: `RESUME:\n${resumeText}\n\n---\n\nJOB DESCRIPTION:\n${jdText}` },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text.trim() : "";
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Parse & validate form data ──────────────────────────────────────────
  let resumeFile: File;
  let jdText: string;
  let resumePages: 1 | 2 = 1;

  try {
    const formData = await req.formData();
    const rawFile = formData.get("resume");
    const rawJd = formData.get("jd");

    if (!rawFile || !(rawFile instanceof File)) {
      return NextResponse.json({ error: "Resume PDF is required." }, { status: 400 });
    }
    if (!rawJd || typeof rawJd !== "string" || !rawJd.trim()) {
      return NextResponse.json({ error: "Job description is required." }, { status: 400 });
    }
    if (rawFile.type !== "application/pdf") {
      return NextResponse.json({ error: "Resume must be a PDF file." }, { status: 400 });
    }
    if (rawFile.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF must be under 5 MB." }, { status: 400 });
    }

    resumeFile = rawFile;
    jdText = rawJd.trim();
    resumePages = formData.get("resumeLength") === "2" ? 2 : 1;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // ── 2. Auth check ───────────────────────────────────────────────────────────
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // ── 3. Rate limit — read profile, enforce 5/day ────────────────────────────
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // @ts-ignore
  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_count, last_reset")
    .eq("id", user.id)
    .maybeSingle() as unknown as { data: Pick<Profile, "daily_count" | "last_reset"> | null };

  const isNewDay = !profile || profile.last_reset !== today;
  const currentCount = isNewDay ? 0 : (profile.daily_count ?? 0);

  if (currentCount >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit of ${DAILY_LIMIT} analyses reached. Try again tomorrow.` },
      { status: 429 },
    );
  }

  // ── 4. Extract text from PDF ───────────────────────────────────────────────
  let resumeText: string;

  try {
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    resumeText = normalizeText(pdfData.text);

    if (resumeText.length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from your PDF. " +
            "Make sure it is not a scanned image — use a text-based PDF.",
        },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to parse the PDF. Please upload a valid, text-based PDF." },
      { status: 400 },
    );
  }

  // ── 5. Two parallel Claude calls ───────────────────────────────────────────
  let claudeResult: ClaudeAnalysis;
  let tailoredResumeText: string;

  try {
    [claudeResult, tailoredResumeText] = await Promise.all([
      runAnalysis(resumeText, jdText),
      runRewrite(resumeText, jdText, resumePages),
    ]);
  } catch {
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 502 },
    );
  }

  // ── 6. Build PDF + 7. Send email (both non-fatal) ─────────────────────────
  let emailSent = false;
  try {
    const pdfBytes = await buildResumePdf(tailoredResumeText);
    await sendResumeEmail(user.email!, pdfBytes, claudeResult.score, claudeResult.summary);
    emailSent = true;
  } catch (err) {
    // Non-fatal: log the error but don't fail the request
    console.error("[analyze] PDF/email step failed:", err);
  }

  // ── 8. Persist analysis ────────────────────────────────────────────────────
  // @ts-ignore
  const { error: insertError } = await (supabase.from("analyses").insert({
    user_id: user.id,
    resume_text: resumeText,
    jd_text: jdText,
    score: claudeResult.score,
    matched_skills: claudeResult.matched_skills,
    missing_skills: claudeResult.missing_skills,
    summary: claudeResult.summary,
  }) as unknown as Promise<{ error: { message: string } | null }>);

  if (insertError) {
    console.error("[analyze] Failed to save analysis:", insertError.message);
  }

  // ── 9. Update daily counter ────────────────────────────────────────────────
  // @ts-ignore
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email!,
      daily_count: currentCount + 1,
      last_reset: today,
    },
    { onConflict: "id" },
  );

  // ── 10. Return result ──────────────────────────────────────────────────────
  const result: AnalyzeResult = {
    score: claudeResult.score,
    matchedSkills: claudeResult.matched_skills,
    missingSkills: claudeResult.missing_skills,
    summary: claudeResult.summary,
    emailSent,
  };

  return NextResponse.json(result);
}
