"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ContactForm from "./ContactForm";

export default function ContactClient() {
  const searchParams = useSearchParams();
  const cafeId = searchParams.get("cafeId");
  const [cafeName, setCafeName] = useState("QuickOrder Partner Cafe");
  const [cafePhone, setCafePhone] = useState("+91 98765 43210");
  const [cafeAddress, setCafeAddress] = useState("On-Campus Food Court, Ground Floor, Academic Block");
  const [cafeEmail, setCafeEmail] = useState("support@quickorder.in");

  useEffect(() => {
    if (!cafeId) return;
    async function fetchCafe() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("cafes")
          .select("business_name, phone_number")
          .eq("id", cafeId)
          .single();
        if (data) {
          if (data.business_name) {
            setCafeName(data.business_name);
            setCafeAddress(`${data.business_name} Counter, Campus Food Court, Academic Block`);
            setCafeEmail(`${data.business_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@quickorder.in`);
          }
          if (data.phone_number) {
            setCafePhone(data.phone_number);
          }
        }
      } catch (e) {
        console.error("Error fetching cafe for contact page:", e);
      }
    }
    fetchCafe();
  }, [cafeId]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title */}
      <div className="border-b-4 border-black pb-4 mb-6">
        <span className="text-xs font-black uppercase tracking-widest text-warning font-sans">Get In Touch</span>
        <h1 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black mt-1">
          Contact &amp; Grievance
        </h1>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-2">
          Merchant and Platform Support Channels
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Contact Info Cards */}
        <div className="space-y-6">
          {/* Card 1: Merchant Contact */}
          <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000] relative overflow-hidden">
            <span className="absolute top-3 right-3 text-2xl">🏪</span>
            <span className="text-xs font-black uppercase tracking-wider text-accent">Cafe / Merchant Contact</span>
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-black mt-1">
              {cafeName}
            </h2>
            <div className="mt-4 space-y-3 font-sans text-sm text-gray-600">
              <div>
                <p className="font-black text-black text-xs uppercase tracking-wider">Address:</p>
                <p className="mt-0.5">{cafeAddress}</p>
              </div>
              <div>
                <p className="font-black text-black text-xs uppercase tracking-wider">Support Phone:</p>
                <p className="mt-0.5">{cafePhone}</p>
              </div>
              <div>
                <p className="font-black text-black text-xs uppercase tracking-wider">Support Email:</p>
                <p className="mt-0.5">{cafeEmail}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Platform Contact */}
          <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000] relative overflow-hidden">
            <span className="absolute top-3 right-3 text-2xl">⚡</span>
            <span className="text-xs font-black uppercase tracking-wider text-warning">Platform Support</span>
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-black mt-1">
              QuickOrder Admin
            </h2>
            <div className="mt-4 space-y-3 font-sans text-sm text-gray-600">
              <div>
                <p className="font-black text-black text-xs uppercase tracking-wider">Grievance Desk Email:</p>
                <p className="mt-0.5 font-mono">spidozx@gmail.com</p>
              </div>
              <div>
                <p className="font-black text-black text-xs uppercase tracking-wider">Platform Website:</p>
                <p className="mt-0.5">quickorder.in</p>
              </div>
            </div>
          </div>

          {/* Card 3: Operating Hours */}
          <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000] relative overflow-hidden">
            <span className="absolute top-3 right-3 text-2xl">🕒</span>
            <span className="text-xs font-black uppercase tracking-wider text-success">Operating Hours</span>
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-black mt-1">
              Timing Schedule
            </h2>
            <div className="mt-2 font-sans text-sm text-gray-600">
              <p className="font-bold text-black">Monday – Sunday</p>
              <p className="text-lg font-black text-success mt-1">8:00 AM – 11:00 PM</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Note: Holiday hours may vary based on campus calendars.</p>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <div>
          <ContactForm cafeName={cafeName} />
        </div>
      </div>
    </div>
  );
}
