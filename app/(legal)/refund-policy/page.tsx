export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy — QuickOrder",
  description: "Guidelines and timelines regarding order cancellations, item stock-outs, and transaction refund processes.",
};

export default async function RefundPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ cafeId?: string }>;
}) {
  const { cafeId } = await searchParams;
  let cafeName = "QuickOrder Partner Cafe";
  let cafePhone = "+91 98765 43210";

  if (cafeId) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("cafes")
        .select("business_name, phone_number")
        .eq("id", cafeId)
        .single();
      if (data) {
        if (data.business_name) cafeName = data.business_name;
        if (data.phone_number) cafePhone = data.phone_number;
      }
    } catch (e) {
      console.error("Error fetching cafe for refund policy:", e);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div className="border-b-4 border-black pb-4 mb-6">
        <span className="text-xs font-black uppercase tracking-widest text-danger font-sans">Payment Terms</span>
        <h1 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black mt-1">
          Refund & Cancellation
        </h1>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2">
          Razorpay Compliant • Last Updated: July 2026
        </p>
      </div>

      {/* Main Card */}
      <div className="border-3 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-6">
        <p className="text-sm leading-relaxed text-gray-700 font-sans">
          This Cancellation & Refund Policy establishes payment terms for orders processed by <strong className="text-black">{cafeName}</strong> via the <strong className="text-black">QuickOrder</strong> checkout platform.
        </p>

        {/* Section 1 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-danger text-white border-2 border-black flex items-center justify-center text-xs font-black">1</span>
            Food Preparation Rule
          </h2>
          <div className="bg-warning/20 border-2.5 border-black p-4 text-sm text-black leading-relaxed font-sans font-bold">
            📢 CRITICAL POLICY NOTICE:
            <p className="font-sans font-normal mt-1">
              Orders once accepted and marked as <strong className="font-black">&quot;preparing&quot;</strong> by the kitchen staff **cannot be cancelled, modified, or refunded**.
            </p>
            <p className="font-sans font-normal mt-1">
              Because food is prepared fresh specifically to your order ticket, ingredients are utilized immediately. Please double-check your item choices, quantities, and seating details before clicking pay.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-danger text-white border-2 border-black flex items-center justify-center text-xs font-black">2</span>
            Failed, Stock-out, & Rejected Orders
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            If an order payment is successfully authorized via Razorpay, but cannot be completed due to one of the following reasons:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 font-sans">
            <li>An ordered item is determined to be out of stock in the kitchen.</li>
            <li>The kitchen manager rejects/declines the order ticket (due to store closing or peak overload).</li>
            <li>A system glitch fails to transfer the order to the kitchen.</li>
          </ul>
          <p className="text-sm leading-relaxed text-gray-700 font-sans mt-2">
            In such events, <strong className="text-black">a full 100% refund</strong> will be initiated automatically to your original source of payment (UPI bank account, card, or wallet) via Razorpay. The refund will reflect in your account within <strong className="text-black">5 to 7 business days</strong>, depending on bank processing cycles.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-danger text-white border-2 border-black flex items-center justify-center text-xs font-black">3</span>
            Wrong Item / Quality Disputes
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            If there is a food quality issue, wrong delivery item, or missing portions in your bag:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 font-sans">
            <li>Do not request refunds via email or payment dispute channels first.</li>
            <li>Please bring the item directly to the counter of <strong className="text-black">{cafeName}</strong> immediately along with your order screen or printed receipt receipt.</li>
            <li>The cafe/canteen manager will evaluate the claim at the spot and provide a replacement, exchange, or arrange a cash/UPI reverse credit if the dispute is valid.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-danger text-white border-2 border-black flex items-center justify-center text-xs font-black">4</span>
            Support Contacts
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            For unresolved refund issues or payment inquiries, please reach out to:
          </p>
          <div className="bg-background border-2 border-black p-4 mt-2 font-mono text-xs text-black space-y-1">
            <p><strong>Merchant Support Phone:</strong> {cafePhone}</p>
            <p><strong>Platform Help Desk:</strong> spidozx@gmail.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
