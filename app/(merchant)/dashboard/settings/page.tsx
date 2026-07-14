"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";


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
  const [upiId, setUpiId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [hasSeating, setHasSeating] = useState<boolean>(false);
  const [tableCount, setTableCount] = useState<number>(0);
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
        .select("id, business_name, upi_id, phone_number, has_seating, table_count, auto_reset_menu")
        .eq("id", user.id)
        .single();

      if (!cafe) {
        router.push("/setup");
        return;
      }

      setCafeId(cafe.id);
      setBusinessName(cafe.business_name || "");
      setUpiId(cafe.upi_id || "");
      setPhoneNumber(cafe.phone_number || "");
      setHasSeating(cafe.has_seating || false);
      setTableCount(cafe.table_count || 0);
      setAutoResetMenu(cafe.auto_reset_menu ?? true);
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

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!cafeId) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const { error: updateError } = await supabase
        .from("cafes")
        .update({
          business_name: businessName.trim(),
          upi_id: upiId.trim(),
          phone_number: phoneNumber.trim() || null,
          has_seating: hasSeating,
          table_count: hasSeating ? tableCount : 0,
          auto_reset_menu: autoResetMenu,
        })
        .eq("id", cafeId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      showToast("Store settings saved successfully ⚡");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update settings.");
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
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <h2 className="text-2xl font-display font-black uppercase text-black tracking-tight mb-4">
            Store Settings
          </h2>

          {errorMessage && (
            <div className="p-3.5 border-2 border-black bg-danger/10 text-danger text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] flex items-center gap-2 rounded-none">
              <span>⚠️</span> {errorMessage}
            </div>
          )}

          {/* ── Cafe Info Card ── */}
          <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-4">
            <h3 className="font-display font-black text-base uppercase tracking-tight text-black flex items-center gap-1.5 border-b-2 border-black pb-2">
              🏪 Cafe Information
            </h3>
            
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-black">
                Cafe Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full bg-white border-2 border-black p-2.5 font-bold text-sm shadow-[2px_2px_0px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000] transition-all outline-none rounded-none"
                placeholder="e.g. Campus Brews"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-black">
                UPI ID (For Payments)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
                className="w-full bg-white border-2 border-black p-2.5 font-bold text-sm shadow-[2px_2px_0px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000] transition-all outline-none rounded-none"
                placeholder="e.g. merchant@upi"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-black">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-white border-2 border-black p-2.5 font-bold text-sm shadow-[2px_2px_0px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000] transition-all outline-none rounded-none"
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          {/* ── Dine-in Seating Card ── */}
          <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-black text-base uppercase tracking-tight text-black flex items-center gap-1.5">
                  🪑 Dine-in Seating
                </h3>
                <p className="text-black/60 text-xs font-bold leading-normal">
                  Enable table-based ordering for dine-in customers.
                </p>
              </div>
              <div className="shrink-0 pt-0.5">
                <ToggleSwitch
                  checked={hasSeating}
                  onChange={(v) => {
                    setHasSeating(v);
                    if (!v) setTableCount(0);
                  }}
                />
              </div>
            </div>

            {hasSeating && (
              <div className="space-y-1 border-t-2 border-dashed border-black/20 pt-3">
                <label className="block text-xs font-black uppercase tracking-wider text-black">
                  Number of Tables
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tableCount}
                  onChange={(e) => setTableCount(parseInt(e.target.value) || 0)}
                  required={hasSeating}
                  className="w-24 bg-white border-2 border-black p-2 font-bold text-sm shadow-[2px_2px_0px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000] transition-all outline-none rounded-none"
                />
              </div>
            )}
          </div>

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
                  onChange={(v) => setAutoResetMenu(v)}
                />
              </div>
            </div>

            <div className="border-t-2 border-dashed border-black/20 pt-3 flex items-center gap-2">
              <span className="text-xs font-bold uppercase">
                {autoResetMenu ? "🟢 Enabled (midnight reset active)" : "🔴 Disabled (items stay out of stock until manual reset)"}
              </span>
            </div>
          </div>

          {/* ── Save Button ── */}
          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-12 border-3 border-black bg-accent text-white font-display font-black text-sm uppercase shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save Settings"}
          </button>
        </form>
      </main>
    </div>
  );
}
