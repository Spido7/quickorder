import type { Metadata } from "next";
import { Suspense } from "react";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy — QuickOrder",
  description: "Privacy policy regarding user personal data, conforming to DPDP Act 2023 and IT Act 2000 compliance guidelines.",
};

export default function PrivacyPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <span className="w-8 h-8 border-2 border-black border-t-accent rounded-full animate-spin inline-block" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2 font-sans">Loading Privacy Policy...</p>
      </div>
    }>
      <PrivacyClient />
    </Suspense>
  );
}
