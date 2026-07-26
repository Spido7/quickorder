export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Cafe, MenuItem } from "@/lib/types";
import MenuClient from "./MenuClient";

// ─── Types for this page ──────────────────────────────────────────────────────
// We only select what the customer page actually needs
type PublicCafe = Pick<Cafe, "id" | "business_name" | "upi_id" | "has_seating">;
type PublicMenuItem = Pick<MenuItem, "id" | "name" | "price" | "is_available" | "category_id">;
type PublicCategory = { id: string; name: string; sort_order: number };

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

import Script from "next/script";

// Server Component: fetch data, hand off to client ────────────────────────
export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ cafeId: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { cafeId } = await params;
  const { table } = await searchParams;
  const supabase = await createClient();

  // Parallel fetch — cafe info + available menu items + categories
  const [
    { data: cafe, error: cafeError },
    { data: items },
    { data: categories }
  ] = await Promise.all([
    supabase
      .from("cafes")
      .select("id, business_name, upi_id, has_seating")
      .eq("id", cafeId)
      .single<PublicCafe>(),
    supabase
      .from("menu_items")
      .select("id, name, price, is_available, category_id")
      .eq("cafe_id", cafeId)
      .order("name")
      .returns<PublicMenuItem[]>(),
    supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("cafe_id", cafeId)
      .order("sort_order", { ascending: true })
      .returns<PublicCategory[]>()
  ]);

  if (cafeError || !cafe) notFound();

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <MenuClient
        cafe={cafe}
        items={items ?? []}
        categories={categories ?? []}
        initialTable={table}
      />
    </>
  );
}

