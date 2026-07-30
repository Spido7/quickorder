import type { Metadata } from "next";
import { Suspense } from "react";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms & Conditions — QuickOrder",
  description: "Terms and conditions for using the QuickOrder QR ordering and delivery platform.",
};

export default function TermsPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <span className="w-8 h-8 border-2 border-black border-t-accent rounded-full animate-spin inline-block" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2 font-sans">Loading Terms...</p>
      </div>
    }>
      <TermsClient />
    </Suspense>
  );
}
