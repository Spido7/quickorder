import { redirect } from "next/navigation";

// Root page: redirect merchants to the dashboard
export default function Home() {
  redirect("/dashboard");
}
