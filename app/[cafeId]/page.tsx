export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Cafe, MenuItem } from "@/lib/types";
import MenuClient from "./MenuClient";

// ─── Types for this page ──────────────────────────────────────────────────────
// We only select what the customer page actually needs
type PublicCafe = Pick<Cafe, "id" | "business_name" | "upi_id" | "has_seating">;
type PublicMenuItem = Pick<MenuItem, "id" | "name" | "price">;

// ─── Dynamic metadata ─────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}): Promise<Metadata> {
  const { cafeId } = await params;
  const supabase = await createClient();
  const { data: cafe } = await supabase
    .from("cafes")
    .select("business_name")
    .eq("id", cafeId)
    .single();

  return {
    title: cafe ? `Menu — ${cafe.business_name}` : "Menu",
    description: cafe
      ? `Browse the menu and order from ${cafe.business_name}. Pay directly via UPI.`
      : "Browse and order from this restaurant.",
  };
}

// ─── Server Component: fetch data, hand off to client ────────────────────────
export default async function MenuPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const supabase = await createClient();

  // Parallel fetch — cafe info + available menu items
  const [{ data: cafe, error: cafeError }, { data: items }] = await Promise.all(
    [
      supabase
        .from("cafes")
        .select("id, business_name, upi_id, has_seating")
        .eq("id", cafeId)
        .single<PublicCafe>(),
      supabase
        .from("menu_items")
        .select("id, name, price")
        .eq("cafe_id", cafeId)
        .eq("is_available", true)
        .order("name")
        .returns<PublicMenuItem[]>(),
    ]
  );

  if (cafeError || !cafe) notFound();

  return <MenuClient cafe={cafe} items={items ?? []} />;
}
