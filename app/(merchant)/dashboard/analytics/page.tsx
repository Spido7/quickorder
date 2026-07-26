import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnalyticsClient from "./AnalyticsClient";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ cafeId?: string }>;
}) {
  const { cafeId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Verify user access to the cafe
  const { data: profile } = await supabase
    .from("cafe_profiles")
    .select("role")
    .eq("user_id", user.id)
    .eq("cafe_id", cafeId)
    .single();

  if (!profile) {
    redirect("/dashboard");
  }

  // 2. Fetch cafe details
  const { data: cafe } = await supabase
    .from("cafes")
    .select("id, business_name")
    .eq("id", cafeId)
    .single();

  if (!cafe) {
    redirect("/dashboard");
  }

  // 3. Fetch all orders for this cafe
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false });

  const activeOrders = orders || [];

  return (
    <AnalyticsClient
      cafe={cafe}
      initialOrders={activeOrders as any[]}
    />
  );
}
