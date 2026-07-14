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
