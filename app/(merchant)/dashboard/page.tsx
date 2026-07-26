import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import MasterDashboardClient from "./MasterDashboardClient";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cafeId?: string }>;
}) {
  const { cafeId } = await searchParams;
  const supabase = await createClient();
  const authResponse = await supabase.auth.getUser();
  let user = authResponse.data.user;

  if (!user && process.env.NODE_ENV === "development") {
    user = { id: "1323e9a6-4069-4f40-bced-115cb1d1d745", email: "owner@example.com" } as any;
  }

  if (!user) {
    redirect("/login");
  }

  // 1. Query Supabase for all cafe_profiles matching auth.uid()
  const { data: profiles } = await supabase
    .from("cafe_profiles")
    .select("cafe_id, role")
    .eq("user_id", user.id);

  const allProfileCafeIds = (profiles || []).map((p) => p.cafe_id);
  const masterCafeIds = (profiles || [])
    .filter((p) => p.role === "master")
    .map((p) => p.cafe_id);

  if (allProfileCafeIds.length === 0) {
    redirect("/setup");
  }

  // 2. Fetch all matching cafes
  const { data: cafesData } = await supabase
    .from("cafes")
    .select("id, business_name, has_seating, table_count")
    .in("id", allProfileCafeIds);

  const cafes = (cafesData || []).map((c) => ({
    ...c,
    name: c.business_name, // Map database column business_name to name
  }));

  // Routing Logic
  if (cafes.length === 0) {
    redirect("/setup");
  }

  // If a specific cafe is requested via query param and the user has access to it:
  if (cafeId && allProfileCafeIds.includes(cafeId)) {
    const selectedCafe = cafes.find((c) => c.id === cafeId);
    if (selectedCafe) {
      // Show back to Master Panel option only if they own multiple cafes
      return <DashboardClient cafe={selectedCafe} hasMultipleCafes={masterCafeIds.length > 1} />;
    }
  }

  // If they only have access to 1 cafe, or if they are staff (not master of multiple outlets):
  if (cafes.length === 1 || masterCafeIds.length <= 1) {
    const defaultCafe = cafes[0];
    return <DashboardClient cafe={defaultCafe} hasMultipleCafes={false} />;
  }

  // If they own multiple cafes (masterCafeIds.length > 1) and no specific cafeId is requested:
  // Fetch all orders across all owned cafes
  const { data: allOrders } = await supabase
    .from("orders")
    .select("*")
    .in("cafe_id", masterCafeIds)
    .order("created_at", { ascending: false });

  // Only display the owned cafes in the breakdown matrix
  const ownedCafes = cafes.filter((c) => masterCafeIds.includes(c.id));

  return <MasterDashboardClient cafes={ownedCafes} orders={allOrders || []} />;
}
