import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupClient from "./SetupClient";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("cafe_profiles")
    .select("cafe_id")
    .eq("user_id", user.id)
    .single();

  if (profile) {
    redirect("/dashboard");
  }

  return <SetupClient />;
}
