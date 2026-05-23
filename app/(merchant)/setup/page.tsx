"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SeatingType } from "@/lib/types";

// Step 3 is "business details"; Step 4 is the new "Add Menu Items" step
type Step = 1 | 2 | 3 | 4;

interface WizardState {
  seatingType: SeatingType | null;
  tableCount: string;
  businessName: string;
  upiId: string;
}

interface DraftItem {
  name: string;
  price: string;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
              s < current
                ? "bg-green-500 text-white"
                : s === current
                ? "bg-orange-500 text-white ring-4 ring-orange-500/20"
                : "bg-white/5 text-white/30 border border-white/10"
            }`}
          >
            {s < current ? "✓" : s}
          </div>
          {s < total && (
            <div className={`h-0.5 w-6 rounded ${s < current ? "bg-green-500" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Option Card ──────────────────────────────────────────────────────────────
function OptionCard({ selected, onClick, emoji, title, subtitle }: {
  selected: boolean; onClick: () => void; emoji: string; title: string; subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.98] ${
        selected
          ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl">{emoji}</span>
        <div className="flex-1">
          <p className="font-semibold text-white text-base">{title}</p>
          <p className="text-white/50 text-sm mt-1">{subtitle}</p>
        </div>
        <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-orange-500 bg-orange-500" : "border-white/30"}`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/60">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-14 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-base"
      />
      {hint && <p className="text-xs text-white/30">{hint}</p>}
    </div>
  );
}

// ─── Step 4: Menu Items ───────────────────────────────────────────────────────
function MenuItemsStep({ cafeId }: { cafeId: string }) {
  const supabase = useRef(createClient()).current;
  const [draft, setDraft] = useState<DraftItem>({ name: "", price: "" });
  const [saved, setSaved] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const canAdd = draft.name.trim().length >= 1 && parseFloat(draft.price) > 0;

  async function handleAddItem() {
    if (!canAdd) return;
    setSaving(true);
    setItemError(null);
    const { error } = await supabase.from("menu_items").insert({
      cafe_id: cafeId,
      name: draft.name.trim(),
      price: parseFloat(draft.price),
      is_available: true,
    });
    if (error) {
      setItemError(error.message);
    } else {
      setSaved((prev) => [...prev, draft]);
      setDraft({ name: "", price: "" });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* AI scan — disabled placeholder */}
      <div className="relative rounded-2xl border-2 border-dashed border-white/15 bg-white/3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-white/50 text-sm font-semibold leading-tight">
                Upload Menu Photo (AI)
              </p>
              <p className="text-white/25 text-xs mt-0.5">
                Snap your printed menu and we fill everything in
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
            Coming Soon
          </span>
        </div>
        {/* Disabled overlay — absorbs clicks */}
        <div className="absolute inset-0 rounded-2xl cursor-not-allowed" />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-white/25 text-xs">or add manually</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Manual item form */}
      <div className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-white/50 mb-1.5">Item Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Masala Chai"
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              className="w-full min-h-12 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-sm"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-white/50 mb-1.5">Price (₹)</label>
            <input
              type="number"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              placeholder="0"
              min="0"
              className="w-full min-h-12 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleAddItem}
          disabled={!canAdd || saving}
          className="w-full min-h-12 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all hover:brightness-110 flex items-center justify-center gap-2"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Adding…</>
          ) : (
            <>+ Add Item Manually</>
          )}
        </button>

        {itemError && (
          <p className="text-red-400 text-xs px-1">{itemError}</p>
        )}
      </div>

      {/* Saved items list */}
      {saved.length > 0 && (
        <div className="space-y-1">
          <p className="text-white/40 text-xs font-medium px-1 mb-2">
            {saved.length} item{saved.length > 1 ? "s" : ""} added ✓
          </p>
          {saved.map((item, i) => (
            <div key={i} className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-green-500/8 border border-green-500/20">
              <span className="text-white/80 text-sm">{item.name}</span>
              <span className="text-green-400 font-semibold text-sm">₹{item.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCafeId, setSavedCafeId] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>({
    seatingType: null, tableCount: "10", businessName: "", upiId: "",
  });

  const supabase = useRef(createClient()).current;

  const next = () => setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const canStep1 = state.seatingType !== null;
  const canStep2 = state.seatingType === "takeaway" || state.tableCount.trim() !== "";
  const canStep3 = state.businessName.trim().length >= 2 && state.upiId.includes("@");

  // Save cafe details and advance to menu-item step
  async function handleSubmitCafe() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setError("Not logged in."); return; }

      const { error: upsertError } = await supabase.from("cafes").upsert({
        id: user.id,
        business_name: state.businessName.trim(),
        upi_id: state.upiId.trim(),
        has_seating: state.seatingType === "tables",
        table_count: state.seatingType === "tables" ? parseInt(state.tableCount) : null,
      });
      if (upsertError) throw upsertError;

      setSavedCafeId(user.id);
      next(); // → step 4 (menu items)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const titles = [
    "How do your customers eat?",
    "How many tables?",
    "Your business details",
    "Add your menu items",
  ];
  const subtitles = [
    "This customises the ordering experience.",
    "We'll create one QR code per table.",
    "Customers pay you directly via UPI.",
    "Add a few items to get started — you can always add more later.",
  ];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-[#0d0d0f]">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">Q</span>
          </div>
          <span className="font-bold text-lg text-white">QuickOrder POS</span>
        </div>
        <p className="text-white/40 text-sm">Let&apos;s get your restaurant set up ✨</p>
      </div>

      <div className="w-full max-w-md bg-[#16161a] border border-white/8 rounded-3xl p-6 shadow-2xl shadow-black/50">
        <StepIndicator current={step} total={4} />

        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">{titles[step - 1]}</h1>
          <p className="text-white/50 text-sm mt-1">{subtitles[step - 1]}</p>
        </div>

        {/* ── Step 1: Seating ── */}
        {step === 1 && (
          <div className="space-y-3">
            <OptionCard selected={state.seatingType === "tables"} onClick={() => setState((s) => ({ ...s, seatingType: "tables" }))} emoji="🪑" title="We have tables" subtitle="Customers sit down and scan a table QR code." />
            <OptionCard selected={state.seatingType === "takeaway"} onClick={() => setState((s) => ({ ...s, seatingType: "takeaway" }))} emoji="🛍️" title="Takeaway / Standing only" subtitle="No fixed seats. One QR for everyone." />
          </div>
        )}

        {/* ── Step 2: Table count ── */}
        {step === 2 && (
          state.seatingType === "tables" ? (
            <InputField label="Number of tables" value={state.tableCount} onChange={(v) => setState((s) => ({ ...s, tableCount: v }))} placeholder="e.g. 12" type="number" hint="You can change this later in settings." />
          ) : (
            <div className="py-6 text-center">
              <span className="text-5xl">🎉</span>
              <p className="text-white font-semibold mt-3">Nothing to do here!</p>
              <p className="text-white/50 text-sm mt-1">We&apos;ll generate one shared QR for your counter.</p>
            </div>
          )
        )}

        {/* ── Step 3: Business details ── */}
        {step === 3 && (
          <div className="space-y-4">
            <InputField label="Restaurant / Cafe name" value={state.businessName} onChange={(v) => setState((s) => ({ ...s, businessName: v }))} placeholder="e.g. Chai Corner" hint="Appears on the customer menu page." />
            <InputField label="UPI ID" value={state.upiId} onChange={(v) => setState((s) => ({ ...s, upiId: v }))} placeholder="e.g. yourcafe@upi" hint="Customers pay directly to this ID." />
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
          </div>
        )}

        {/* ── Step 4: Menu items ── */}
        {step === 4 && savedCafeId && (
          <MenuItemsStep cafeId={savedCafeId} />
        )}

        {/* ── Navigation ── */}
        <div className="flex gap-3 mt-8">
          {step > 1 && step < 4 && (
            <button onClick={back} className="flex-1 min-h-12 rounded-xl border border-white/10 text-white/60 font-medium text-sm active:scale-[0.97] transition-all hover:border-white/20">
              ← Back
            </button>
          )}

          {step < 3 && (
            <button onClick={next} disabled={step === 1 ? !canStep1 : !canStep2} className="flex-1 min-h-12 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all hover:brightness-110">
              Continue →
            </button>
          )}

          {step === 3 && (
            <button onClick={handleSubmitCafe} disabled={!canStep3 || loading} className="flex-1 min-h-12 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all hover:brightness-110 flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : "Save & Continue →"}
            </button>
          )}

          {step === 4 && (
            <button onClick={() => router.push("/dashboard")} className="flex-1 min-h-12 rounded-xl bg-green-500 text-white font-bold text-sm active:scale-[0.97] transition-all hover:brightness-110 shadow-lg shadow-green-500/25">
              Go to Dashboard 🎉
            </button>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-white/25 text-center">
        Already set up?{" "}
        <a href="/dashboard" className="text-orange-500 hover:underline">Go to dashboard</a>
      </p>
    </div>
  );
}
