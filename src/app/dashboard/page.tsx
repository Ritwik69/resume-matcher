// Dashboard — protected page (middleware enforces auth)
// Fetches the current user's past analyses server-side and renders them.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pull a display title from the raw job description (first non-empty line). */
function extractJobTitle(jdText: string): string {
  const first = jdText.split("\n").find((l) => l.trim().length > 0) ?? "Untitled position";
  const trimmed = first.trim();
  return trimmed.length > 72 ? trimmed.slice(0, 72) + "…" : trimmed;
}

/** Tailwind color tokens for a given score. */
function scoreTheme(score: number) {
  if (score >= 80)
    return {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      bar: "bg-emerald-500",
      label: "Strong match",
    };
  if (score >= 60)
    return {
      text: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      bar: "bg-yellow-500",
      label: "Good match",
    };
  if (score >= 40)
    return {
      text: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      bar: "bg-orange-500",
      label: "Partial match",
    };
  return {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    bar: "bg-red-500",
    label: "Weak match",
  };
}

/** Format an ISO date string to "Jan 1, 2025". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch analyses (skip resume_text — large, unneeded here) and profile in parallel
  const [{ data: analyses }, { data: profile }] = await Promise.all([
    supabase
      .from("analyses")
      .select("id, score, matched_skills, missing_skills, summary, jd_text, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("daily_count, last_reset").eq("id", user.id).maybeSingle(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const dailyCount = profile?.last_reset === today ? (profile.daily_count ?? 0) : 0;
  const totalCount = analyses?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#07070f] text-white antialiased">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-white/5 bg-[#07070f]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-900/50">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-gray-100 tracking-tight group-hover:text-white transition-colors">
              ResumeMatcher
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-3">
            <span className="hidden md:block text-xs text-gray-600 truncate max-w-[200px]">
              {user.email}
            </span>
            <SignOutButton />

            {/* New Analysis CTA */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg
                         bg-gradient-to-r from-violet-600 to-indigo-600
                         hover:from-violet-500 hover:to-indigo-500
                         text-white shadow-md shadow-violet-900/30
                         transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
              New Analysis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-6 pt-10 pb-24">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Your Analyses</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount === 0
                ? "No analyses yet — run your first one below."
                : `${totalCount} total analysis${totalCount !== 1 ? "es" : ""}`}
            </p>
          </div>

          {/* Daily usage widget */}
          <div className="flex items-center gap-3 rounded-2xl bg-gray-900/50 border border-white/5 px-4 py-3 shrink-0">
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-300 tabular-nums">
                {dailyCount}
                <span className="text-gray-600 font-normal"> / 5</span>
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">used today</p>
            </div>
            {/* Dot progress */}
            <div className="flex gap-1.5 items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    i < dailyCount ? "bg-violet-500 shadow-sm shadow-violet-700/50" : "bg-gray-800"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Empty state ── */}
        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-28 gap-6 text-center">
            {/* Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                <svg className="w-9 h-9 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              {/* Ambient glow */}
              <div className="pointer-events-none absolute inset-0 -z-10 bg-violet-700/10 blur-2xl rounded-full" />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-gray-300">Nothing here yet</p>
              <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
                Upload your resume and paste a job description to get an instant AI-powered match score.
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl
                         bg-gradient-to-r from-violet-600 to-indigo-600
                         hover:from-violet-500 hover:to-indigo-500
                         text-white shadow-lg shadow-violet-900/30
                         transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Run your first analysis
            </Link>
          </div>
        )}

        {/* ── Analysis list ── */}
        {totalCount > 0 && (
          <div className="space-y-3">
            {analyses!.map((analysis) => {
              const theme = scoreTheme(analysis.score);
              const jobTitle = extractJobTitle(analysis.jd_text);
              const matchedPreview = analysis.matched_skills.slice(0, 5);
              const missingPreview = analysis.missing_skills.slice(0, 4);
              const extraMatched = analysis.matched_skills.length - matchedPreview.length;
              const extraMissing = analysis.missing_skills.length - missingPreview.length;

              return (
                <div
                  key={analysis.id}
                  className="group rounded-2xl bg-gray-900/40 border border-white/5
                             hover:border-white/10 hover:bg-gray-900/60
                             transition-all duration-200 p-5"
                >
                  <div className="flex gap-4">
                    {/* Score badge */}
                    <div
                      className={`shrink-0 w-16 h-16 rounded-xl ${theme.bg} border ${theme.border}
                                  flex flex-col items-center justify-center gap-0.5`}
                    >
                      <span className={`text-2xl font-bold tabular-nums leading-none ${theme.text}`}>
                        {analysis.score}
                      </span>
                      <span className="text-[9px] text-gray-600 uppercase tracking-widest">score</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-gray-200 leading-snug truncate">
                            {jobTitle}
                          </h2>
                          {/* Match quality label + score bar */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-medium ${theme.text}`}>
                              {theme.label}
                            </span>
                            <div className="flex-1 max-w-[120px] h-1 rounded-full bg-gray-800">
                              <div
                                className={`h-full rounded-full ${theme.bar} transition-all duration-500`}
                                style={{ width: `${analysis.score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-gray-600">
                          {formatDate(analysis.created_at)}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {analysis.summary}
                      </p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {/* Matched */}
                        {matchedPreview.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                              Matched
                            </span>
                            {matchedPreview.map((skill) => (
                              <span
                                key={skill}
                                className="text-[10px] px-1.5 py-0.5 rounded-md
                                           bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              >
                                {skill}
                              </span>
                            ))}
                            {extraMatched > 0 && (
                              <span className="text-[10px] text-emerald-800">+{extraMatched}</span>
                            )}
                          </div>
                        )}

                        {/* Missing */}
                        {missingPreview.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-red-800 uppercase tracking-wider">
                              Missing
                            </span>
                            {missingPreview.map((skill) => (
                              <span
                                key={skill}
                                className="text-[10px] px-1.5 py-0.5 rounded-md
                                           bg-red-500/10 border border-red-500/20 text-red-400"
                              >
                                {skill}
                              </span>
                            ))}
                            {extraMissing > 0 && (
                              <span className="text-[10px] text-red-900">+{extraMissing}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-gray-700">ResumeMatcher · Built with Claude AI</span>
          <span className="text-xs text-gray-700">5 analyses / day · free</span>
        </div>
      </footer>
    </div>
  );
}
