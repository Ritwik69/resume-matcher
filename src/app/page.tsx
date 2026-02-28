import AnalyzeForm from "@/components/AnalyzeForm";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#07070f] text-white antialiased">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-white/5 bg-[#07070f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-900/50">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-gray-100 tracking-tight">ResumeMatcher</span>
          </div>

          {/* Auth links */}
          <div className="flex items-center gap-2">
            <a href="/login"
              className="text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5">
              Sign in
            </a>
            <a href="/signup"
              className="text-xs font-medium px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors border border-white/8">
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-14 px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-violet-700/12 blur-[120px]" />
        <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-indigo-600/10 blur-[80px]" />

        <div className="relative max-w-2xl mx-auto text-center space-y-5">
          {/* Headline */}
          <h1 className="text-5xl sm:text-[3.75rem] font-bold tracking-tight leading-[1.08]">
            Match your resume
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
              to any job.
            </span>
          </h1>

          {/* Sub */}
          <p className="text-[15px] text-gray-400 max-w-md mx-auto leading-relaxed">
            Upload your resume and paste a job description. Get an instant AI-powered match score,
            skill gap analysis, and a tailored summary in seconds.
          </p>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-6 pt-1">
            {[
              { value: "0–100", label: "Match score" },
              { value: "Skills", label: "Gap analysis" },
              { value: "AI", label: "Tailored summary" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-sm font-semibold text-gray-200">{value}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form ── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Section card */}
          <div className="rounded-3xl bg-gray-900/30 border border-white/5 p-6 sm:p-8 shadow-2xl shadow-black/40">
            <AnalyzeForm />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-white/5 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold text-gray-600 uppercase tracking-widest mb-12">
            How it works
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Upload your resume",
                desc: "Drag and drop your PDF resume into the upload zone.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                ),
              },
              {
                step: "02",
                title: "Paste the job posting",
                desc: "Copy the full job description including requirements and responsibilities.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                ),
              },
              {
                step: "03",
                title: "Get your analysis",
                desc: "Receive a match score, skill gap breakdown, and an AI-written summary.",
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                ),
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {icon}
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-600/70 mb-1.5 tabular-nums">{step}</p>
                  <h3 className="text-sm font-semibold text-gray-200 mb-2">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-[180px] mx-auto">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xs text-gray-700">ResumeMatcher · Built with Claude AI</span>
          <span className="text-xs text-gray-700">5 analyses / day · free</span>
        </div>
      </footer>
    </div>
  );
}
