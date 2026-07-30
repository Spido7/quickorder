import Link from "next/link";

interface FooterPoliciesProps {
  cafeId?: string;
}

export default function FooterPolicies({ cafeId }: FooterPoliciesProps) {
  const queryParam = cafeId ? `?cafeId=${cafeId}` : "";

  return (
    <footer className="w-full mt-16 py-8 px-4 border-t-2.5 border-black bg-surface-elevated text-center print:hidden">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 font-sans">
          © {new Date().getFullYear()} QuickOrder. Secured by Razorpay.
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          <Link
            href={`/terms${queryParam}`}
            className="text-xs font-black uppercase tracking-tight text-black hover:text-accent transition-colors duration-150 border-b border-black/0 hover:border-black"
          >
            Terms & Conditions
          </Link>
          <Link
            href={`/privacy${queryParam}`}
            className="text-xs font-black uppercase tracking-tight text-black hover:text-accent transition-colors duration-150 border-b border-black/0 hover:border-black"
          >
            Privacy Policy
          </Link>
          <Link
            href={`/refund-policy${queryParam}`}
            className="text-xs font-black uppercase tracking-tight text-black hover:text-accent transition-colors duration-150 border-b border-black/0 hover:border-black"
          >
            Refund & Cancellation Policy
          </Link>
          <Link
            href={`/contact${queryParam}`}
            className="text-xs font-black uppercase tracking-tight text-black hover:text-accent transition-colors duration-150 border-b border-black/0 hover:border-black"
          >
            Contact & Grievance Info
          </Link>
        </div>
      </div>
    </footer>
  );
}
