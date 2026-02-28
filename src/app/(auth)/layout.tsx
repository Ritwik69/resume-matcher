// Shared layout for all auth pages (/login, /signup).
// Provides the dark background, centered flex container, and ambient glow.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center p-4">
      {/* Ambient violet glow — mirrors the homepage hero */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-violet-700/10 blur-[130px]" />
      {children}
    </div>
  );
}
