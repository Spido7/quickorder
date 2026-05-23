import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0d0d0f] px-6 text-center">
      <span className="text-6xl mb-6">🍽️</span>
      <h1 className="text-white font-bold text-2xl">Menu not found</h1>
      <p className="text-white/50 text-sm mt-3 max-w-xs leading-relaxed">
        This QR code doesn&apos;t match any restaurant in our system. Ask the
        staff for a fresh code.
      </p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 rounded-xl bg-white/8 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/12 transition-all"
      >
        Go home
      </Link>
    </div>
  );
}
