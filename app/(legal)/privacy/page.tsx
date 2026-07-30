export const runtime = "edge";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Privacy Policy — QuickOrder",
  description: "Privacy policy regarding user personal data, conforming to DPDP Act 2023 and IT Act 2000 compliance guidelines.",
};

export default async function PrivacyPage({
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
      console.error("Error fetching cafe for privacy:", e);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div className="border-b-4 border-black pb-4 mb-6">
        <span className="text-xs font-black uppercase tracking-widest text-success font-sans">Compliance Page</span>
        <h1 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black mt-1">
          Privacy Policy
        </h1>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2">
          DPDP Act 2023 & IT Act 2000 Compliant • Last Updated: July 2026
        </p>
      </div>

      {/* Main Container */}
      <div className="border-3 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-6">
        <p className="text-sm leading-relaxed text-gray-700 font-sans">
          This Privacy Policy outlines how <strong className="text-black font-extrabold font-sans">QuickOrder</strong> and its merchant canteen partners, including <strong className="text-black">{cafeName}</strong>, collect, process, store, and secure your information when you use our web ordering applications.
        </p>

        {/* Section 1 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-success text-white border-2 border-black flex items-center justify-center text-xs font-black">1</span>
            Data Collection & DPDP Compliance
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            Under the **Digital Personal Data Protection Act, 2023 (DPDP)**, we process your personal details strictly based on **consent** or **legitimate use** (e.g., executing order delivery/processing). We collect:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 font-sans">
            <li><strong className="text-black">Customer Name:</strong> To identify food bags/receipts at the canteen counter.</li>
            <li><strong className="text-black">Mobile Number:</strong> To send order status update alerts or coordinate delivery.</li>
            <li><strong className="text-black">Room/Hostel Delivery Address:</strong> For delivery agents to route orders directly to your room.</li>
            <li><strong className="text-black">Order Details & Table Number:</strong> To prepare, queue, and deliver foods correctly.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-success text-white border-2 border-black flex items-center justify-center text-xs font-black">2</span>
            Direct Razorpay Billing Processing
          </h2>
          <div className="bg-danger/5 border-2 border-danger p-4 text-sm text-gray-700 leading-relaxed font-sans space-y-2">
            <p className="font-extrabold text-black uppercase tracking-wider text-xs">⚠️ ABSOLUTE CREDIT SECURITY WARNING:</p>
            <p>
              We do **NOT** request, process, or store raw credit/debit card numbers, net-banking passcodes, or UPI security PIN credentials on our database servers. 
            </p>
            <p>
              All payment processes are handled securely by **Razorpay Software Private Limited**. Your banking information remains encrypted within Razorpay's high-security environment (PCI-DSS Level 1 certified), rendering it fully invisible to both QuickOrder and the merchant canteen.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-success text-white border-2 border-black flex items-center justify-center text-xs font-black">3</span>
            Purpose of Processing
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            We use the collected information solely for immediate service actions:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 font-sans">
            <li>Kitchen ticket formatting (canteen display systems).</li>
            <li>Delivery verification and driver routing.</li>
            <li>Grievance management and payment transaction confirmation.</li>
          </ul>
          <p className="text-sm leading-relaxed text-gray-600 font-sans mt-2">
            We **never** sell, rent, or trade your contact info or search habits to third-party ad networks or data aggregators.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 border-t-2 border-black/10 pt-4">
          <h2 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-none bg-success text-white border-2 border-black flex items-center justify-center text-xs font-black">4</span>
            Your Rights: Access & Deletion
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 font-sans">
            In compliance with Section 6 of the DPDP Act 2023, you hold the right to:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 font-sans">
            <li>Withdraw consent for ongoing data retention.</li>
            <li>Request deletion of your order records and hostel room addresses from our tables.</li>
            <li>Correct/rectify contact profiles stored for checkout convenience.</li>
          </ul>
          <p className="text-sm leading-relaxed text-gray-600 font-sans mt-2">
            To submit a data removal/deletion request, kindly mail us at <strong className="text-black">spidozx@gmail.com</strong> or contact the cafe representative directly at <strong className="text-black">{cafePhone}</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
