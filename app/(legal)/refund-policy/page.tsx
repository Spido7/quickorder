import type { Metadata } from "next";
import { Suspense } from "react";
import RefundClient from "./RefundClient";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy — QuickOrder",
  description: "Guidelines and timelines regarding order cancellations, item stock-outs, and transaction refund processes.",
};

export default function RefundPolicyPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <span className="w-8 h-8 border-2 border-black border-t-accent rounded-full animate-spin inline-block" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2 font-sans">Loading Refund Policy...</p>
      </div>
    }>
      <RefundClient />
    </Suspense>
  );
}
