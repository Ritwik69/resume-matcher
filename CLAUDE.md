# Resume Matcher App

## What this app does
Users upload a PDF resume and paste a job description.
Claude AI analyzes it and returns:
- Match score (0-100)
- Matched skills
- Missing skills
- Tailored resume summary

## Tech Stack
- Next.js 14 (App Router)
- Supabase (auth + postgres + storage)
- Anthropic Claude API (claude-sonnet-4-6)
- Tailwind CSS
- Deployed on Vercel

## Database Tables
- analyses: id, user_id, resume_text, jd_text, score, matched_skills[], missing_skills[], summary, created_at
- profiles: id, email, daily_count, last_reset

## Rules
- Max 5 analyses per user per day
- Always extract text from PDF before sending to Claude
- Score must be integer 0-100
- All API routes must check auth
- Use server components where possible
- Keep code clean and well commented