"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AnalyticsClient from "./AnalyticsClient";

function AnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cafeId = searchParams.get("cafeId");
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cafe, setCafe] = useState<{ id: string; business_name: string } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user && process.env.NODE_ENV === "development") {
          user = { id: "1323e9a6-4069-4f40-bced-115cb1d1d745", email: "owner@example.com" } as any;
        }
        if (!user) {
          router.push("/login");
          return;
        }

        if (!cafeId) {
          router.push("/dashboard");
          return;
        }

        // 1. Verify user access to the cafe
        const { data: profile } = await supabase
          .from("cafe_profiles")
          .select("role")
          .eq("user_id", user.id)
          .eq("cafe_id", cafeId)
          .single();

        if (!profile) {
          router.push("/dashboard");
          return;
        }

        // 2. Fetch cafe details
        const { data: cafeData } = await supabase
          .from("cafes")
          .select("id, business_name")
          .eq("id", cafeId)
          .single();

        if (!cafeData) {
          router.push("/dashboard");
          return;
        }

        // 3. Fetch all orders for this cafe
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*")
          .eq("cafe_id", cafeId)
          .order("created_at", { ascending: false });

        setCafe(cafeData);
        setOrders(ordersData || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [supabase, router, cafeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          <span className="font-bold text-sm uppercase tracking-wider">Loading Analytics…</span>
        </div>
      </div>
    );
  }

  if (error || !cafe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="p-4 border-2 border-black bg-danger/10 text-danger text-sm font-bold">
          ⚠️ Error loading analytics: {error || "Cafe not found"}
        </div>
      </div>
    );
  }

  return <AnalyticsClient cafe={cafe} initialOrders={orders} />;
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          <span className="font-bold text-sm uppercase tracking-wider">Loading Analytics…</span>
        </div>
      </div>
    }>
      <AnalyticsPageContent />
    </Suspense>
  );
}

