"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import type { AnalyzeResult } from "@/types";

export default function AnalyzeForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jdText, setJdText] = useState("");
  const [resumeLength, setResumeLength] = useState<"1" | "2">("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setError(null);
    } else {
      setError("Please upload a PDF file.");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.type === "application/pdf") {
      setFile(selected);
      setError(null);
    } else if (selected) {
      setError("Please upload a PDF file.");
    }
  };

  const handleSubmit = async () => {
    if (!file) return setError("Please upload your resume PDF.");
    if (!jdText.trim()) return setError("Please paste a job description.");

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jd", jdText);
      formData.append("resumeLength", resumeLength);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });

      if (res.status === 401) {
        setError("Please sign in to analyze your resume.");
        return;
      }
      if (res.status === 429) {
        setError("Daily limit reached (5 analyses/day). Try again tomorrow.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(await res.json());
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const scoreColor = (s: number) =>
    s >= 75 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";

  const ringColor = (s: number) =>
    s >= 75 ? "#34d399" : s >= 50 ? "#fbbf24" : "#f87171";

  const circumference = 2 * Math.PI * 52;

  return (
    <div className="w-full space-y-6">
      {/* Upload + JD grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── PDF Upload Zone ── */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Resume <span className="text-violet-400">PDF</span>
          </label>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              "relative flex flex-col items-center justify-center gap-4 min-h-[220px]",
              "rounded-2xl border-2 border-dashed cursor-pointer select-none",
              "transition-all duration-200 group",
              isDragging
                ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
                : file
                ? "border-violet-500/40 bg-violet-500/5"
                : "border-gray-700/80 bg-gray-900/40 hover:border-gray-600 hover:bg-gray-900/70",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <>
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* PDF icon */}
                <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <div className="text-center px-8">
                  <p className="text-sm font-medium text-gray-100 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatBytes(file.size)}</p>
                </div>
                <span className="text-xs text-violet-400/70 font-medium">Click to replace</span>
              </>
            ) : (
              <>
                {/* Upload icon */}
                <div className={[
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200",
                  isDragging ? "bg-violet-500/25" : "bg-gray-800 group-hover:bg-gray-700/80",
                ].join(" ")}>
                  <svg
                    className={["w-7 h-7 transition-colors duration-200", isDragging ? "text-violet-300" : "text-gray-400 group-hover:text-gray-300"].join(" ")}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium text-gray-300">
                    {isDragging ? "Drop it here" : "Drop your resume here"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">or click to browse · PDF only</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Job Description ── */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Job <span className="text-violet-400">Description</span>
          </label>

          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job description here — include requirements, responsibilities, and preferred qualifications…"
            className={[
              "flex-1 min-h-[220px] resize-none rounded-2xl",
              "bg-gray-900/40 border border-gray-700/80",
              "text-sm text-gray-200 placeholder-gray-600",
              "px-5 py-4 leading-relaxed",
              "focus:outline-none focus:border-violet-500/50 focus:bg-gray-900/70",
              "transition-colors duration-200",
            ].join(" ")}
          />

          <p className="text-xs text-gray-700 text-right tabular-nums">
            {jdText.length.toLocaleString()} chars
          </p>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-500/8 border border-red-500/20 px-4 py-3.5">
          <svg className="w-4.5 h-4.5 text-red-400 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-red-300 leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Resume length preference ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest shrink-0">
          Tailored resume length
        </span>
        <div className="flex rounded-xl overflow-hidden border border-gray-700/80 w-fit">
          {(["1", "2"] as const).map((pages) => (
            <button
              key={pages}
              type="button"
              onClick={() => setResumeLength(pages)}
              className={[
                "px-5 py-2 text-sm font-semibold transition-colors duration-150 select-none",
                resumeLength === pages
                  ? "bg-violet-600 text-white"
                  : "bg-gray-900/60 text-gray-400 hover:text-gray-200 hover:bg-gray-800/60",
              ].join(" ")}
            >
              {pages} page{pages === "2" ? "s" : ""}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-600 leading-snug">
          {resumeLength === "1"
            ? "Concise — only the strongest, most relevant content."
            : "Detailed — fuller work history and broader skill coverage."}
        </span>
      </div>

      {/* ── Submit ── */}
      <button
        onClick={handleSubmit}
        disabled={loading || !file || !jdText.trim()}
        className={[
          "w-full py-4 rounded-2xl font-semibold text-[15px]",
          "bg-gradient-to-r from-violet-600 to-indigo-600",
          "hover:from-violet-500 hover:to-indigo-500",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none",
          "text-white shadow-lg shadow-violet-900/40",
          "transition-all duration-200 hover:shadow-violet-500/30 hover:scale-[1.01]",
          "active:scale-[0.99]",
          "flex items-center justify-center gap-2.5",
        ].join(" ")}
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing with Claude AI…
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Analyze Match
          </>
        )}
      </button>

      {/* ── Results ── */}
      {result && (
        <div className="results-appear space-y-5">
          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700/60 to-transparent" />

          {/* Email confirmation banner */}
          {result.emailSent && (
            <div className="flex items-center gap-3 rounded-xl bg-violet-500/8 border border-violet-500/20 px-4 py-3">
              <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-violet-300">
                Your tailored resume PDF has been emailed to you — check your inbox.
              </p>
            </div>
          )}

          {/* Score + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Score ring card */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-900/60 border border-gray-800/80 py-8 px-4">
              <div className="relative w-[120px] h-[120px]">
                <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#1f2937" strokeWidth="9" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={ringColor(result.score)}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (result.score / 100) * circumference}
                    style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
                  />
                </svg>
                {/* Overlay number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold tabular-nums leading-none ${scoreColor(result.score)}`}>
                    {result.score}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">/ 100</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Match Score</p>
                <p className={`text-xs mt-1 font-medium ${scoreColor(result.score)}`}>
                  {result.score >= 75 ? "Strong match" : result.score >= 50 ? "Partial match" : "Low match"}
                </p>
              </div>
            </div>

            {/* Summary card */}
            <div className="lg:col-span-2 rounded-2xl bg-gray-900/60 border border-gray-800/80 p-6">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">AI Summary</h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
            </div>
          </div>

          {/* Skills row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Matched */}
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800/80 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Matched Skills{" "}
                  <span className="text-emerald-400 normal-case">({result.matchedSkills.length})</span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.map((skill) => (
                  <span key={skill} className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing */}
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800/80 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400/50" />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Missing Skills{" "}
                  <span className="text-red-400 normal-case">({result.missingSkills.length})</span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills.map((skill) => (
                  <span key={skill} className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Start over */}
          <button
            onClick={() => { setResult(null); setFile(null); setJdText(""); setError(null); }}
            className="w-full py-3 rounded-2xl text-sm font-medium text-gray-500 border border-gray-800 hover:border-gray-600 hover:text-gray-300 transition-colors duration-200"
          >
            Start New Analysis
          </button>
        </div>
      )}
    </div>
  );
}
