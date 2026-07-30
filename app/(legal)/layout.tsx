"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function HeaderContent() {
  const searchParams = useSearchParams();
  const cafeId = searchParams.get("cafeId");
  const backHref = cafeId ? `/${cafeId}` : "/";

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b-4 border-black px-4 py-4 print:hidden">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-display font-black text-xl uppercase tracking-tight text-black flex items-center gap-1.5 hover:opacity-85 transition-opacity">
          <span className="text-warning">⚡</span> QuickOrder
        </Link>
        <Link
          href={backHref}
          className="px-4 py-2 bg-warning text-black font-display font-black text-sm uppercase border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
        >
          ← Back to Menu
        </Link>
      </div>
    </header>
  );
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-warning selection:text-black">
      <Suspense fallback={
        <header className="sticky top-0 z-50 w-full bg-background border-b-4 border-black px-4 py-4 print:hidden">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="font-display font-black text-xl uppercase tracking-tight text-black">⚡ QuickOrder</span>
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Loading...</span>
          </div>
        </header>
      }>
        <HeaderContent />
      </Suspense>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-12 md:py-16">
        {children}
      </main>
    </div>
  );
}
