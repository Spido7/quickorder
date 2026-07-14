"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateAutoResetPreference } from "../actions";

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center border-2 border-black transition-colors duration-150 rounded-none ${checked ? "bg-success" : "bg-white"}`}
    >
      <span className={`inline-block h-5 w-5 bg-white border-2 border-black transition-transform duration-150 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [autoResetMenu, setAutoResetMenu] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: cafe } = await supabase
        .from("cafes")
        .select("id, business_name, auto_reset_menu")
        .eq("id", user.id)
        .single();

      if (!cafe) {
        router.push("/setup");
        return;
      }

      setCafeId(cafe.id);
      setBusinessName(cafe.business_name);
      setAutoResetMenu(cafe.auto_reset_menu);
      setLoading(false);
    }
    init();
  }, [supabase, router]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  async function handleToggleReset(status: boolean) {
    if (!cafeId) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      // Optimistic update
      setAutoResetMenu(status);
      const result = await updateAutoResetPreference(cafeId, status);
      if (result.success) {
        showToast("Daily menu reset preference saved successfully ⚡");
      }
    } catch (err: any) {
      // Revert status
      setAutoResetMenu(!status);
      setErrorMessage(err.message || "Failed to update preference. Make sure you have master privileges.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-black border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background w-full max-w-md xl:max-w-7xl mx-auto text-black">
      
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs bg-success text-white border-2 border-black p-3.5 shadow-[4px_4px_0px_0px_#000] font-black uppercase text-xs flex items-center justify-center gap-2 animate-in slide-in-from-top-4 duration-200">
          <span>⚡</span> {toastMessage}
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white border-b-2 border-black">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-black font-black text-xs border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0px_0px_#000] cursor-pointer hover:bg-zinc-50 transition-colors rounded-none"
            >
              ← Back
            </button>
            <div>
              <p className="font-display font-black text-black text-sm leading-tight uppercase tracking-tight">Settings</p>
              <p className="text-black/60 text-xs font-bold uppercase truncate max-w-[180px]">
                {businessName}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 px-4 py-6 space-y-6 max-w-md mx-auto w-full">
        <h2 className="text-2xl font-display font-black uppercase text-black tracking-tight mb-4">
          Store Settings
        </h2>

        {errorMessage && (
          <div className="p-3.5 border-2 border-black bg-danger/10 text-danger text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] flex items-center gap-2 rounded-none">
            <span>⚠️</span> {errorMessage}
          </div>
        )}

        {/* ── Daily Menu Reset Card ── */}
        <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-display font-black text-base uppercase tracking-tight text-black flex items-center gap-1.5">
                ⏰ Daily Menu Reset
              </h3>
              <p className="text-black/60 text-xs font-bold leading-normal">
                Automatically restock all sold-out items every night at 12:00 AM.
              </p>
            </div>
            <div className="shrink-0 pt-0.5">
              <ToggleSwitch
                checked={autoResetMenu}
                onChange={handleToggleReset}
                disabled={saving}
              />
            </div>
          </div>

          <div className="border-t-2 border-dashed border-black/20 pt-3 flex items-center gap-2">
            <span className="text-xs font-bold uppercase">
              {autoResetMenu ? "🟢 Enabled (midnight reset active)" : "🔴 Disabled (items stay out of stock until manual reset)"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
