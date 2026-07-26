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

  const { data: profiles } = await supabase
    .from("cafe_profiles")
    .select("cafe_id")
    .eq("user_id", user.id);

  if (profiles && profiles.length > 0) {
    redirect("/dashboard");
  }

  return <SetupClient />;
}
