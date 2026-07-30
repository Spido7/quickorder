import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Terms & Conditions — QuickOrder",
  description: "Terms and conditions for using the QuickOrder QR ordering and delivery platform.",
};

export default async function TermsPage({
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
      console.error("Error fetching cafe for terms:", e);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div className="border-b-4 border-black pb-4 mb-6">
        <span className="text-xs font-black uppercase tracking-widest text-accent font-sans">Legal Agreement</span>
        <h1 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black mt-1">
          Terms & Conditions
        </h1>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2">
          Last Updated: July 2026 • Platform: QuickOrder
        </p>
      </div>

      {/* Main Accordion/Card Structure */}
      <div className="border-3 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-6">
        <p className="text-sm sm:text-base leading-relaxed text-gray-700 font-sans">
          Welcome to <strong className="text-black font-extrabold font-sans">QuickOrder</strong>. By scanning the QR code, visiting our platform, placing orders, or using any of our digital self-ordering, counter pick-up, or hostel/room food delivery services, you agree to be bound by these Terms & Conditions. Please read them carefully.
        </p>

        {/* Section 1 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-warning border-2 border-black flex items-center justify-center text-xs font-black">1</span>
            Acceptance of Services
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            Our platform provides a contactless digital interface for browsing menus, selecting items, placing digital orders, and coordinating room delivery or counter collection from <strong className="text-black">{cafeName}</strong>. You confirm that you are legally eligible to enter into binding agreements and that all details provided are authentic.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-warning border-2 border-black flex items-center justify-center text-xs font-black">2</span>
            Secured Online Payments
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            All financial transactions initiated on the QuickOrder platform are securely routed and processed via **Razorpay Software Private Limited** (Razorpay). 
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 font-sans">
            <li>You agree to provide accurate, complete, and current billing details during payment checkout.</li>
            <li>We do not store or process raw credit cards, debit cards, net-banking passwords, or UPI PIN credentials. All sensitive credentials are handled directly in Razorpay's PCI-DSS compliant secure checkout frame.</li>
            <li>Once transaction authorization is confirmed by Razorpay, your order is pushed directly to the kitchen queue for immediate processing.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-warning border-2 border-black flex items-center justify-center text-xs font-black">3</span>
            Usage Rules & Fair Play
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            To ensure optimal kitchen throughput and fairness to fellow customers, you agree to:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 font-sans">
            <li>Refrain from placing spam, mock, or duplicate orders.</li>
            <li>Provide accurate seating tables (for dine-in) or accurate hostel block and room numbers (for delivery). Specifying false tables or delivery locations disrupts canteen services and may lead to blacklisting.</li>
            <li>Maintain decorum when retrieving counter pickup items.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-warning border-2 border-black flex items-center justify-center text-xs font-black">4</span>
            Limitation of Liability
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            QuickOrder acts as a software platform facilitating restaurant self-ordering. Canteen food preparation quality, ingredient choices, allergens, and preparation time guidelines are solely handled by the merchant (<strong className="text-black">{cafeName}</strong>).
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-warning border-2 border-black flex items-center justify-center text-xs font-black">5</span>
            Contact & Queries
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            If you have questions regarding these Terms & Conditions or have grievance issues, please contact our support at:
          </p>
          <div className="bg-background border-2 border-black p-4 mt-2 font-mono text-xs text-black space-y-1">
            <p><strong>Merchant:</strong> {cafeName}</p>
            <p><strong>Support Phone:</strong> {cafePhone}</p>
            <p><strong>Platform Email:</strong> spidozx@gmail.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
