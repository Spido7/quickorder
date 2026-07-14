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
            className={`w-8 h-8 flex items-center justify-center text-sm font-black border-2 border-black transition-all ${
              s < current
                ? "bg-success text-white"
                : s === current
                ? "bg-warning text-black shadow-[2px_2px_0px_0px_#000]"
                : "bg-white text-black/30 border-black/25"
            }`}
          >
            {s < current ? "✓" : s}
          </div>
          {s < total && (
            <div className={`h-0.5 w-6 ${s < current ? "bg-black" : "bg-black/20"}`} />
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
      className={`w-full p-5 text-left transition-all active:scale-[0.98] border-2 border-black rounded-none cursor-pointer ${
        selected
          ? "bg-warning shadow-[4px_4px_0px_0px_#000]"
          : "bg-white hover:bg-zinc-50 shadow-[2px_2px_0px_0px_#000]"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl">{emoji}</span>
        <div className="flex-1">
          <p className="font-black text-black text-base uppercase tracking-tight">{title}</p>
          <p className="text-black/60 text-sm font-bold mt-1">{subtitle}</p>
        </div>
        <div className={`mt-1 w-5 h-5 border-2 border-black flex items-center justify-center shrink-0 ${selected ? "bg-black" : "bg-white"}`}>
          {selected && <div className="w-2 h-2 bg-white" />}
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
      <label className="block text-xs font-black uppercase tracking-wider text-black">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-14 px-4 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-base placeholder:text-gray-400"
      />
      {hint && <p className="text-xs font-bold text-black/55">{hint}</p>}
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
      <div className="relative border-2 border-dashed border-black bg-white p-4 rounded-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-black font-black text-sm uppercase tracking-tight">
                Upload Menu Photo (AI)
              </p>
              <p className="text-black/55 text-xs mt-0.5 font-bold">
                Snap your printed menu and we fill everything in
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-black uppercase tracking-wider px-2.5 py-1 bg-violet-100 text-violet-700 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            Coming Soon
          </span>
        </div>
        {/* Disabled overlay — absorbs clicks */}
        <div className="absolute inset-0 cursor-not-allowed" />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-0.5 bg-black/10" />
        <span className="text-black/40 text-xs font-black uppercase">or add manually</span>
        <div className="flex-1 h-0.5 bg-black/10" />
      </div>

      {/* Manual item form */}
      <div className="bg-white border-2 border-black p-4 space-y-4 rounded-none shadow-[4px_4px_0px_0px_#000]">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">Item Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Masala Chai"
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              className="w-full min-h-12 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none text-sm placeholder:text-gray-400"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">Price (₹)</label>
            <input
              type="number"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              placeholder="0"
              min="0"
              className="w-full min-h-12 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none text-sm placeholder:text-gray-400"
            />
          </div>
        </div>

        <button
          onClick={handleAddItem}
          disabled={!canAdd || saving}
          className="w-full min-h-12 bg-accent text-white font-display font-black uppercase tracking-tight text-sm border-2 border-black shadow-[3px_3px_0px_0px_#000] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Adding…</>
          ) : (
            <>+ Add Item Manually</>
          )}
        </button>

        {itemError && (
          <p className="text-danger text-xs font-bold px-1">⚠️ {itemError}</p>
        )}
      </div>

      {/* Saved items list */}
      {saved.length > 0 && (
        <div className="space-y-2">
          <p className="text-black/60 text-xs font-black uppercase px-1">
            {saved.length} item{saved.length > 1 ? "s" : ""} added ✓
          </p>
          <div className="space-y-1.5">
            {saved.map((item, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-3 bg-success/10 border-2 border-black font-bold text-black rounded-none">
                <span className="text-sm">{item.name}</span>
                <span className="text-success font-black text-sm">₹{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function SetupClient() {
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
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-background">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-black flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_#ff6b35]">
            <span className="text-white text-sm font-black">Q</span>
          </div>
          <span className="font-display font-black text-xl text-black uppercase tracking-tight">QuickOrder POS</span>
        </div>
        <p className="text-black/60 text-sm font-bold uppercase tracking-wider">Let&apos;s get your restaurant set up ⚡</p>
      </div>

      <div className="w-full max-w-md bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] rounded-none">
        <StepIndicator current={step} total={4} />

        <div className="mb-6">
          <h1 className="text-2xl font-display font-black uppercase text-black tracking-tight">{titles[step - 1]}</h1>
          <p className="text-black/60 text-sm font-bold mt-1">{subtitles[step - 1]}</p>
        </div>

        {/* ── Step 1: Seating ── */}
        {step === 1 && (
          <div className="space-y-4">
            <OptionCard selected={state.seatingType === "tables"} onClick={() => setState((s) => ({ ...s, seatingType: "tables" }))} emoji="🪑" title="We have tables" subtitle="Customers sit down and scan a table QR code." />
            <OptionCard selected={state.seatingType === "takeaway"} onClick={() => setState((s) => ({ ...s, seatingType: "takeaway" }))} emoji="🛍️" title="Takeaway / Standing only" subtitle="No fixed seats. One QR for everyone." />
          </div>
        )}

        {/* ── Step 2: Table count ── */}
        {step === 2 && (
          state.seatingType === "tables" ? (
            <InputField label="Number of tables" value={state.tableCount} onChange={(v) => setState((s) => ({ ...s, tableCount: v }))} placeholder="e.g. 12" type="number" hint="You can change this later in settings." />
          ) : (
            <div className="py-6 text-center border-2 border-black bg-success/10 rounded-none shadow-[4px_4px_0px_0px_#000]">
              <span className="text-5xl">🎉</span>
              <p className="text-black font-black uppercase tracking-tight mt-3">Nothing to do here!</p>
              <p className="text-black/60 text-sm font-bold mt-1">We&apos;ll generate one shared QR for your counter.</p>
            </div>
          )
        )}

        {/* ── Step 3: Business details ── */}
        {step === 3 && (
          <div className="space-y-4">
            <InputField label="Restaurant / Cafe name" value={state.businessName} onChange={(v) => setState((s) => ({ ...s, businessName: v }))} placeholder="e.g. Chai Corner" hint="Appears on the customer menu page." />
            <InputField label="UPI ID" value={state.upiId} onChange={(v) => setState((s) => ({ ...s, upiId: v }))} placeholder="e.g. yourcafe@upi" hint="Customers pay directly to this ID. Use a Merchant/Business UPI ID to ensure amounts pre-fill automatically for customers." />
            {error && <div className="p-3 border-2 border-black bg-danger/10 text-danger text-sm font-bold">⚠️ {error}</div>}
          </div>
        )}

        {/* ── Step 4: Menu items ── */}
        {step === 4 && savedCafeId && (
          <MenuItemsStep cafeId={savedCafeId} />
        )}

        {/* ── Navigation ── */}
        <div className="flex gap-3 mt-8">
          {step > 1 && step < 4 && (
            <button onClick={back} className="flex-1 min-h-12 bg-white border-2 border-black text-black font-bold text-sm shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-zinc-50 transition-all cursor-pointer">
              ← Back
            </button>
          )}

          {step < 3 && (
            <button onClick={next} disabled={step === 1 ? !canStep1 : !canStep2} className="flex-1 min-h-12 bg-warning text-black font-display font-black uppercase tracking-tight text-sm border-2 border-black shadow-[3px_3px_0px_0px_#000] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer">
              Continue →
            </button>
          )}

          {step === 3 && (
            <button onClick={handleSubmitCafe} disabled={!canStep3 || loading} className="flex-1 min-h-12 bg-warning text-black font-display font-black uppercase tracking-tight text-sm border-2 border-black shadow-[3px_3px_0px_0px_#000] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer">
              {loading ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Saving…</> : "Save & Continue →"}
            </button>
          )}

          {step === 4 && (
            <button onClick={() => router.push("/dashboard")} className="flex-1 min-h-12 bg-success text-white font-display font-black uppercase tracking-tight text-sm border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer">
              Go to Dashboard 🎉
            </button>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-black/60 font-bold uppercase tracking-wider text-center">
        Already set up?{" "}
        <a href="/dashboard" className="text-accent underline font-black">Go to dashboard</a>
      </p>
    </div>
  );
}

