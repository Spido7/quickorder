"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      const { data: profile } = await supabase
        .from("cafe_profiles")
        .select("cafe_id")
        .eq("user_id", data.user.id)
        .single();

      if (profile) {
        router.push("/dashboard");
      } else {
        router.push("/setup");
      }
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-white border-3 border-black p-8 space-y-6 shadow-[6px_6px_0px_0px_#000]">
        <div className="text-center">
          <h1 className="text-3xl font-display font-black uppercase tracking-tight text-black">
            Welcome Back
          </h1>
          <p className="text-sm font-bold uppercase tracking-wider text-black/60 mt-2">
            Log in to your merchant account
          </p>
        </div>

        {error && (
          <div className="p-3 border-2 border-black bg-danger/10 text-danger text-sm font-bold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              className="block text-xs font-black uppercase tracking-wider text-black mb-1.5"
              htmlFor="email"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-12 px-4 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none text-base placeholder:text-gray-400"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label
              className="block text-xs font-black uppercase tracking-wider text-black mb-1.5"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-12 px-4 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none text-base placeholder:text-gray-400"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-14 bg-warning text-black font-display font-black uppercase tracking-tight text-base border-2 border-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center mt-6 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
            ) : (
              "Sign In ⚡"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

