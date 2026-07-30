import type { Metadata } from "next";
import { Suspense } from "react";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Us & Grievance — QuickOrder",
  description: "Get in touch with customer support or file feedback for QuickOrder and partner canteens.",
};

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <span className="w-8 h-8 border-2 border-black border-t-accent rounded-full animate-spin inline-block" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2 font-sans">Loading Support Info...</p>
      </div>
    }>
      <ContactClient />
    </Suspense>
  );
}
