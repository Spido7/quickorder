"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import QRCode from "react-qr-code";
import { saveCafeSecrets, getCafeSecrets } from "../actions";



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

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetCafeId = searchParams.get("cafeId");
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
  const [activeTab, setActiveTab] = useState<"profile" | "payments" | "system" | "qr" | "account">("profile");
  const [rpayKeyId, setRpayKeyId] = useState("");
  const [rpayKeySecret, setRpayKeySecret] = useState("");
  const [savingSecrets, setSavingSecrets] = useState(false);

  const [selectedTable, setSelectedTable] = useState<string>("0");
  const [printMode, setPrintMode] = useState<"single" | "all">("single");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin.replace(/\/$/, ""));
      document.documentElement.classList.remove("dark");
      localStorage.removeItem("theme");
    }
  }, []);

  const downloadQRCode = () => {
    const svgElement = document.querySelector("#qr-container svg");
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `table-${selectedTable}-${cafeId || "cafe"}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user && process.env.NODE_ENV === "development") {
        user = { id: "1323e9a6-4069-4f40-bced-115cb1d1d745", email: "owner@example.com" } as any;
      }
      if (!user) {
        router.push("/login");
        return;
      }

      // Query which cafes this user has access to
      const { data: profiles } = await supabase
        .from("cafe_profiles")
        .select("cafe_id")
        .eq("user_id", user.id);

      const allProfileCafeIds = (profiles || []).map((p) => p.cafe_id);

      if (allProfileCafeIds.length === 0) {
        router.push("/setup");
        return;
      }

      // Determine which cafe settings to load
      let resolvedCafeId = targetCafeId;
      if (!resolvedCafeId || !allProfileCafeIds.includes(resolvedCafeId)) {
        resolvedCafeId = allProfileCafeIds[0];
      }

      const { data: cafe } = await supabase
        .from("cafes")
        .select("id, business_name, upi_id, phone_number, has_seating, table_count, auto_reset_menu")
        .eq("id", resolvedCafeId)
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

      // Fetch Secrets
      try {
        const secrets = await getCafeSecrets(cafe.id);
        setRpayKeyId(secrets.keyId);
        setRpayKeySecret(secrets.keySecret);
      } catch (err) {
        console.error("Error loading cafe secrets:", err);
      }

      setLoading(false);
    }
    init();
  }, [supabase, router, targetCafeId]);

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

  async function handleSaveSecrets(e: React.FormEvent) {
    e.preventDefault();
    if (!cafeId) return;
    setSavingSecrets(true);
    setErrorMessage(null);
    try {
      await saveCafeSecrets(cafeId, rpayKeyId.trim(), rpayKeySecret.trim());
      showToast("Razorpay credentials saved successfully ⚡");
      // Reload secrets to mask keySecret
      const secrets = await getCafeSecrets(cafeId);
      setRpayKeyId(secrets.keyId);
      setRpayKeySecret(secrets.keySecret);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update Razorpay credentials.");
    } finally {
      setSavingSecrets(false);
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
    <div className="min-h-dvh flex flex-col bg-background w-full max-w-6xl mx-auto text-black">
      
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
              onClick={() => router.push(cafeId ? `/dashboard?cafeId=${cafeId}` : "/dashboard")}
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
      <main className="flex-1 px-4 py-6 w-full space-y-6">
        <h2 className="text-2xl font-display font-black uppercase text-black tracking-tight mb-4 no-print border-b-4 border-black pb-2">
          Store Settings
        </h2>

        {errorMessage && (
          <div className="p-3.5 border-2 border-black bg-danger/10 text-danger text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] flex items-center gap-2 rounded-none no-print">
            <span>⚠️</span> {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 md:gap-8 items-start">
          {/* ── Left Sidebar (Tabs Selector) ── */}
          <div className="no-print grid grid-cols-2 md:grid-cols-1 gap-3">
            {[
              { id: "profile", label: "🏪 Profile", desc: "Branding & UPI details" },
              { id: "payments", label: "💳 Razorpay Keys", desc: "Configure custom keys" },
              { id: "system", label: "⚙️ System & Seating", desc: "Dine-in, theme & resets" },
              { id: "qr", label: "📱 QR Operations", desc: "Print table links" },
              { id: "account", label: "🚪 Account Control", desc: "Logout & session" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left p-3.5 border-2 border-black transition-all cursor-pointer rounded-none flex flex-col gap-0.5 ${
                    active
                      ? "bg-warning text-black shadow-[4px_4px_0px_0px_#000]"
                      : "bg-white text-black/75 hover:bg-zinc-50 shadow-[2px_2px_0px_0px_#000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  }`}
                >
                  <span className="font-display font-black text-xs sm:text-sm uppercase tracking-tight truncate">
                    {tab.label}
                  </span>
                  <span className="hidden md:inline text-[10px] font-bold text-black/60 uppercase tracking-wider">
                    {tab.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Right Content Area ── */}
          <div className="w-full max-w-xl md:max-w-none">
            {activeTab === "profile" && (
              <section className="space-y-4 no-print">
                <div className="border-b-2 border-black pb-1.5">
                  <h3 className="text-md font-display font-black uppercase text-black tracking-tight flex items-center gap-1.5">
                    🏪 Profile & Payments
                  </h3>
                  <p className="text-black/60 text-[10px] font-black uppercase tracking-wider">
                    Manage your customer-facing cafe profile and direct payout UPI ID
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Cafe Info Card */}
                  <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-4">
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

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full min-h-12 border-3 border-black bg-accent text-white font-display font-black text-sm uppercase shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Saving Changes..." : "💾 Save Profile Details"}
                  </button>
                </form>
              </section>
            )}

            {activeTab === "payments" && (
              <section className="space-y-4 no-print">
                <div className="border-b-2 border-black pb-1.5">
                  <h3 className="text-md font-display font-black uppercase text-black tracking-tight flex items-center gap-1.5">
                    💳 Razorpay Credentials
                  </h3>
                  <p className="text-black/60 text-[10px] font-black uppercase tracking-wider">
                    Enter your Razorpay API details. If left empty, checkout falls back to standard UPI.
                  </p>
                </div>

                <form onSubmit={handleSaveSecrets} className="space-y-6">
                  <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-black uppercase tracking-wider text-black">
                        Razorpay Key ID
                      </label>
                      <input
                        type="text"
                        value={rpayKeyId}
                        onChange={(e) => setRpayKeyId(e.target.value)}
                        className="w-full bg-white border-2 border-black p-2.5 font-bold text-sm shadow-[2px_2px_0px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000] transition-all outline-none rounded-none"
                        placeholder="e.g. rzp_test_xxxxxxxxxxxxxx"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-black uppercase tracking-wider text-black">
                        Razorpay Key Secret
                      </label>
                      <input
                        type="password"
                        value={rpayKeySecret}
                        onChange={(e) => setRpayKeySecret(e.target.value)}
                        className="w-full bg-white border-2 border-black p-2.5 font-bold text-sm shadow-[2px_2px_0px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000] transition-all outline-none rounded-none"
                        placeholder={rpayKeySecret ? "••••••••••••••••" : "Enter Key Secret"}
                      />
                      <p className="text-[10px] font-bold text-black/55 uppercase tracking-wide">
                        This is encrypted securely on our database and cannot be read by customers.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSecrets}
                    className="w-full min-h-12 border-3 border-black bg-accent text-white font-display font-black text-sm uppercase shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingSecrets ? "Saving Credentials..." : "💾 Save Razorpay Keys"}
                  </button>
                </form>
              </section>
            )}

            {activeTab === "system" && (

              <section className="space-y-4 no-print">
                <div className="border-b-2 border-black pb-1.5">
                  <h3 className="text-md font-display font-black uppercase text-black tracking-tight flex items-center gap-1.5">
                    ⚙️ System & Seating Configuration
                  </h3>
                  <p className="text-black/60 text-[10px] font-black uppercase tracking-wider">
                    Set dine-in options, table limits, and daily stock reset rules
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Dine-in Seating Card */}
                  <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-display font-black text-sm uppercase tracking-tight text-black flex items-center gap-1.5">
                          🪑 Dine-in Seating
                        </h4>
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

                  {/* Daily Menu Reset Card */}
                  <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-display font-black text-sm uppercase tracking-tight text-black flex items-center gap-1.5">
                          ⏰ Daily Menu Reset
                        </h4>
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


                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full min-h-12 border-3 border-black bg-accent text-white font-display font-black text-sm uppercase shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Saving Changes..." : "💾 Save System Settings"}
                  </button>
                </form>
              </section>
            )}

            {activeTab === "qr" && (
              <section className="space-y-4 no-print">
                <div className="border-b-2 border-black pb-1.5">
                  <h3 className="text-md font-display font-black uppercase text-black tracking-tight flex items-center gap-1.5">
                    📱 Operations & QR Codes
                  </h3>
                  <p className="text-black/60 text-[10px] font-black uppercase tracking-wider">
                    Generate QR links for customer self-ordering at tables or counter
                  </p>
                </div>

                {/* QR Codes Generator Card */}
                <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-4">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="block text-xs font-black uppercase tracking-wider text-black">
                          Select Table
                        </label>
                        <select
                          value={selectedTable}
                          onChange={(e) => setSelectedTable(e.target.value)}
                          className="w-full bg-white border-2 border-black p-2.5 font-bold text-sm shadow-[2px_2px_0px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000] transition-all outline-none rounded-none cursor-pointer"
                        >
                          <option value="0">Counter (Takeaway)</option>
                          {hasSeating && tableCount > 0 && Array.from({ length: tableCount }, (_, i) => {
                            const num = String(i + 1);
                            return <option key={num} value={num}>Table {num}</option>;
                          })}
                        </select>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <label className="block text-xs font-black uppercase tracking-wider text-black">
                          Print Mode
                        </label>
                        <select
                          value={printMode}
                          onChange={(e) => setPrintMode(e.target.value as "single" | "all")}
                          className="w-full bg-white border-2 border-black p-2.5 font-bold text-sm shadow-[2px_2px_0px_0px_#000] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_#000] transition-all outline-none rounded-none cursor-pointer"
                        >
                          <option value="single">Selected Table Only</option>
                          <option value="all">All Tables (Sheet)</option>
                        </select>
                      </div>
                    </div>

                    {/* QR Preview Block */}
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-black bg-zinc-50 shadow-[4px_4px_0px_0px_#000]">
                      <div id="qr-container" className="p-3 bg-white border-2 border-black mb-3">
                        <QRCode
                          value={`${origin || "https://quickorder.pages.dev"}/${cafeId}?table=${selectedTable}`}
                          size={140}
                          level="H"
                        />
                      </div>
                      <p className="font-display font-black text-xs uppercase tracking-wider text-black bg-warning border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000] mb-2">
                        {selectedTable === "0" ? "COUNTER" : `TABLE ${selectedTable}`}
                      </p>
                      <p className="text-[10px] font-black uppercase text-black/60 tracking-widest truncate max-w-full px-2 text-center">
                        {origin || "https://quickorder.pages.dev"}/{cafeId}?table={selectedTable}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={downloadQRCode}
                        className="min-h-10 border-2 border-black bg-white hover:bg-zinc-50 text-black font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer rounded-none"
                      >
                        📥 Download SVG
                      </button>
                      <button
                        type="button"
                        onClick={() => typeof window !== "undefined" && window.print()}
                        className="min-h-10 border-2 border-black bg-accent text-white font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer rounded-none"
                      >
                        🖨️ Print QR(s)
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "account" && (
              <section className="space-y-4 no-print">
                <div className="border-b-2 border-black pb-1.5">
                  <h3 className="text-md font-display font-black uppercase text-black tracking-tight flex items-center gap-1.5">
                    🚪 Session Management
                  </h3>
                  <p className="text-black/60 text-[10px] font-black uppercase tracking-wider">
                    Control your current active merchant browser session and security credentials
                  </p>
                </div>

                {/* Log Out Card */}
                <div className="bg-white border-3 border-black p-5 shadow-[6px_6px_0px_0px_#000] rounded-none space-y-3">
                  <p className="text-black/60 text-xs font-bold leading-normal">
                    Sign out of your merchant account on this device.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push("/login");
                    }}
                    className="w-full min-h-10 border-2 border-black bg-danger text-white font-display font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer rounded-none"
                  >
                    Log Out From Cafe
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* ── Printable QRs Sheet ── */}
      {cafeId && (
        <div id="print-area" className="hidden">
          {printMode === "single" ? (
            <div className="flex flex-col items-center justify-center p-8 bg-white min-h-[600px]">
              <div className="border-4 border-black bg-[#f5f2eb] p-8 flex flex-col items-center justify-center text-center w-[250px] h-[360px] shadow-[6px_6px_0px_0px_#000]">
                <h2 className="font-display font-black text-xl uppercase tracking-tight text-black mb-1">{businessName}</h2>
                <div className="my-5 p-3 bg-white border-2 border-black">
                  <QRCode value={`${origin || "https://quickorder.pages.dev"}/${cafeId}?table=${selectedTable}`} size={140} level="H" />
                </div>
                <p className="font-display font-black text-base uppercase tracking-wider text-black bg-warning border-2 border-black px-4 py-1.5 shadow-[3px_3px_0px_0px_#000]">
                  {selectedTable === "0" ? "COUNTER" : `TABLE ${selectedTable}`}
                </p>
                <p className="text-[10px] font-black uppercase text-black/60 tracking-widest mt-4">SCAN TO ORDER</p>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white">
              <h1 className="text-2xl font-display font-black uppercase tracking-tight text-center mb-6 border-b-4 border-black pb-2">
                {businessName} — QR Code Sheet
              </h1>
              <div className="grid grid-cols-2 gap-8 justify-items-center">
                {/* Counter QR card */}
                <div className="border-4 border-black bg-[#f5f2eb] p-6 flex flex-col items-center justify-center text-center w-[220px] h-[320px] shadow-[4px_4px_0px_0px_#000] break-inside-avoid">
                  <h2 className="font-display font-black text-lg uppercase tracking-tight text-black mb-1">{businessName}</h2>
                  <div className="my-4 p-2 bg-white border-2 border-black">
                    <QRCode value={`${origin || "https://quickorder.pages.dev"}/${cafeId}?table=0`} size={120} level="H" />
                  </div>
                  <p className="font-display font-black text-sm uppercase tracking-wider text-black bg-warning border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
                    COUNTER
                  </p>
                  <p className="text-[10px] font-black uppercase text-black/60 tracking-widest mt-3">SCAN TO ORDER</p>
                </div>

                {/* Table QR cards */}
                {hasSeating && tableCount > 0 && Array.from({ length: tableCount }, (_, i) => {
                  const num = String(i + 1);
                  return (
                    <div key={num} className="border-4 border-black bg-[#f5f2eb] p-6 flex flex-col items-center justify-center text-center w-[220px] h-[320px] shadow-[4px_4px_0px_0px_#000] break-inside-avoid">
                      <h2 className="font-display font-black text-lg uppercase tracking-tight text-black mb-1">{businessName}</h2>
                      <div className="my-4 p-2 bg-white border-2 border-black">
                        <QRCode value={`${origin || "https://quickorder.pages.dev"}/${cafeId}?table=${num}`} size={120} level="H" />
                      </div>
                      <p className="font-display font-black text-sm uppercase tracking-wider text-black bg-warning border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
                        TABLE {num}
                      </p>
                      <p className="text-[10px] font-black uppercase text-black/60 tracking-widest mt-3">SCAN TO ORDER</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Embedded print stylesheet rules */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          #print-area {
            display: block !important;
            background: white !important;
            width: 100% !important;
            max-width: none !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 9999 !important;
          }
          .min-h-dvh, .max-w-md, .mx-auto, .bg-background {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          <span className="font-bold text-sm uppercase tracking-wider">Loading Settings…</span>
        </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}

