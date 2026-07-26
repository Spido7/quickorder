"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SetupClient from "./SetupClient";

export default function SetupPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);

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

        const { data: profiles } = await supabase
          .from("cafe_profiles")
          .select("cafe_id")
          .eq("user_id", user.id);

        if (profiles && profiles.length > 0) {
          router.push("/dashboard");
          return;
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    init();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          <span className="font-bold text-sm uppercase tracking-wider">Checking Status…</span>
        </div>
      </div>
    );
  }

  return <SetupClient />;
}
