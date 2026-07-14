"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAutoResetPreference(cafeId: string, status: boolean) {
  const supabase = await createClient();

  // 1. Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // 2. Query the cafe_profiles table to check if the user has role = 'master' for this specific cafeId
  const { data: profile, error: profileError } = await supabase
    .from("cafe_profiles")
    .select("role")
    .eq("cafe_id", cafeId)
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "master") {
    throw new Error("Forbidden: Must have master role for this cafe");
  }

  // 3. Update the preferences in public.cafes
  const { error: updateError } = await supabase
    .from("cafes")
    .update({ auto_reset_menu: status })
    .eq("id", cafeId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // 4. Revalidate paths
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  return { success: true };
}

export async function createCategory(cafeId: string, name: string) {
  const supabase = await createClient();

  // 1. Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // 2. Query the cafe_profiles table to check if the user has role = 'master' for this specific cafeId
  const { data: profile, error: profileError } = await supabase
    .from("cafe_profiles")
    .select("role")
    .eq("cafe_id", cafeId)
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "master") {
    throw new Error("Forbidden: Must have master role for this cafe");
  }

  // 3. Find current max sort_order
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("sort_order")
    .eq("cafe_id", cafeId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = categories && categories.length > 0 ? (categories[0].sort_order ?? 0) + 1 : 0;

  // 4. Insert category
  const { data, error: insertError } = await supabase
    .from("menu_categories")
    .insert({
      cafe_id: cafeId,
      name: name.trim(),
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  // 5. Revalidate paths
  revalidatePath("/dashboard");
  revalidatePath(`/${cafeId}`);

  return { success: true, category: data };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();

  // 1. Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch category to verify cafe_id
  const { data: category, error: categoryError } = await supabase
    .from("menu_categories")
    .select("cafe_id")
    .eq("id", categoryId)
    .single();

  if (categoryError || !category) {
    throw new Error("Category not found");
  }

  // 3. Query the cafe_profiles table to check if the user has role = 'master' for this specific cafeId
  const { data: profile, error: profileError } = await supabase
    .from("cafe_profiles")
    .select("role")
    .eq("cafe_id", category.cafe_id)
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "master") {
    throw new Error("Forbidden: Must have master role for this cafe");
  }

  // 4. Delete the category
  const { error: deleteError } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  // 5. Revalidate paths
  revalidatePath("/dashboard");
  revalidatePath(`/${category.cafe_id}`);

  return { success: true };
}

// ─── Coupon Management ─────────────────────────────────────────────────────────

export async function createCoupon(
  cafeId: string,
  data: {
    code: string;
    discount_type: "flat" | "percentage";
    discount_value: number;
    min_order_value: number;
    max_discount_amount: number | null;
    usage_limit: number | null;
    expires_at: string | null;
  }
) {
  const supabase = await createClient();

  // 1. Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // 2. Verify master role
  const { data: profile, error: profileError } = await supabase
    .from("cafe_profiles")
    .select("role")
    .eq("cafe_id", cafeId)
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "master") {
    throw new Error("Forbidden: Must have master role for this cafe");
  }

  // 3. Insert coupon
  const { data: coupon, error: insertError } = await supabase
    .from("coupons")
    .insert({
      merchant_id: cafeId,
      code: data.code.trim().toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_order_value: data.min_order_value,
      max_discount_amount: data.max_discount_amount,
      usage_limit: data.usage_limit,
      expires_at: data.expires_at,
      is_active: true,
      times_used: 0,
    })
    .select()
    .single();

  if (insertError) {
    // Handle unique constraint violation for code
    if (insertError.code === "23505") {
      throw new Error("A coupon with this code already exists.");
    }
    throw new Error(insertError.message);
  }

  revalidatePath("/dashboard/coupons");
  return { success: true, coupon };
}

export async function toggleCoupon(couponId: string, isActive: boolean) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // Fetch coupon to get merchant_id
  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("merchant_id")
    .eq("id", couponId)
    .single();

  if (couponError || !coupon) {
    throw new Error("Coupon not found");
  }

  // Verify master role
  const { data: profile, error: profileError } = await supabase
    .from("cafe_profiles")
    .select("role")
    .eq("cafe_id", coupon.merchant_id)
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "master") {
    throw new Error("Forbidden: Must have master role for this cafe");
  }

  const { error: updateError } = await supabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", couponId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/dashboard/coupons");
  return { success: true };
}

export async function deleteCoupon(couponId: string) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // Fetch coupon to get merchant_id
  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("merchant_id")
    .eq("id", couponId)
    .single();

  if (couponError || !coupon) {
    throw new Error("Coupon not found");
  }

  // Verify master role
  const { data: profile, error: profileError } = await supabase
    .from("cafe_profiles")
    .select("role")
    .eq("cafe_id", coupon.merchant_id)
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "master") {
    throw new Error("Forbidden: Must have master role for this cafe");
  }

  const { error: deleteError } = await supabase
    .from("coupons")
    .delete()
    .eq("id", couponId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/dashboard/coupons");
  return { success: true };
}
