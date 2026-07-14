"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Coupon } from "@/lib/types";
import { createCoupon, toggleCoupon, deleteCoupon } from "../actions";

export default function CouponsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percentage">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Init: fetch user, cafeId, and coupons
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: cafe } = await supabase
        .from("cafes")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!cafe) {
        router.push("/setup");
        return;
      }

      setCafeId(cafe.id);

      const { data: couponsData } = await supabase
        .from("coupons")
        .select("*")
        .eq("merchant_id", cafe.id)
        .order("created_at", { ascending: false });

      if (couponsData) setCoupons(couponsData as Coupon[]);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = useCallback(() => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderValue("0");
    setMaxDiscountAmount("");
    setUsageLimit("");
    setExpiresAt("");
    setFormError(null);
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeId || !code.trim() || !discountValue.trim()) return;

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const val = parseFloat(discountValue);
      if (isNaN(val) || val <= 0) throw new Error("Discount value must be a positive number.");

      if (discountType === "percentage" && val > 100) {
        throw new Error("Percentage discount cannot exceed 100%.");
      }

      const result = await createCoupon(cafeId, {
        code: code.trim(),
        discount_type: discountType,
        discount_value: val,
        min_order_value: parseFloat(minOrderValue) || 0,
        max_discount_amount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        expires_at: expiresAt || null,
      });

      if (result.success && result.coupon) {
        setCoupons((prev) => [result.coupon as Coupon, ...prev]);
        setFormSuccess(`Coupon "${code.trim().toUpperCase()}" created successfully!`);
        resetForm();
        setTimeout(() => setFormSuccess(null), 4000);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (couponId: string, currentActive: boolean) => {
    // Optimistic update
    setCoupons((prev) =>
      prev.map((c) => (c.id === couponId ? { ...c, is_active: !currentActive } : c))
    );
    try {
      await toggleCoupon(couponId, !currentActive);
    } catch (err: any) {
      // Revert on error
      setCoupons((prev) =>
        prev.map((c) => (c.id === couponId ? { ...c, is_active: currentActive } : c))
      );
      alert(err.message || "Failed to update coupon.");
    }
  };

  const handleDelete = async (couponId: string, couponCode: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${couponCode}"? This cannot be undone.`)) return;

    setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    try {
      await deleteCoupon(couponId);
    } catch (err: any) {
      alert(err.message || "Failed to delete coupon.");
      // Refetch on error
      if (cafeId) {
        const { data } = await supabase.from("coupons").select("*").eq("merchant_id", cafeId).order("created_at", { ascending: false });
        if (data) setCoupons(data as Coupon[]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-black border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background w-full max-w-2xl mx-auto text-black">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b-2 border-black">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-8 h-8 bg-white flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              ←
            </button>
            <div>
              <p className="font-display font-black text-black text-sm leading-tight uppercase tracking-tight">Coupon Management</p>
              <p className="text-black/60 text-xs font-bold uppercase">
                {coupons.length} coupon{coupons.length !== 1 ? "s" : ""} created
              </p>
            </div>
          </div>
          <span className="text-2xl">🎟️</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-8">
        {/* Create Coupon Form */}
        <div className="mx-4 mt-5 bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
          <h2 className="font-display font-black text-base uppercase tracking-tight mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
            ✨ Create New Coupon
          </h2>

          {formError && (
            <div className="mb-4 p-2.5 border-2 border-black bg-danger/10 text-danger text-xs font-bold">
              ⚠️ {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 p-2.5 border-2 border-black bg-success/10 text-success text-xs font-bold">
              ✅ {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreateCoupon} className="space-y-4">
            {/* Promo Code */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                Promo Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CAMPUS20"
                className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm uppercase placeholder:text-gray-400 placeholder:normal-case"
              />
            </div>

            {/* Discount Type + Value */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "flat" | "percentage")}
                  className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm cursor-pointer"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  Discount Value
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "e.g. 20" : "e.g. 50"}
                  className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Min Order + Max Discount */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  Min Order Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm placeholder:text-gray-400"
                />
              </div>
              {discountType === "percentage" && (
                <div className="flex-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                    Max Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="No cap"
                    className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm placeholder:text-gray-400"
                  />
                </div>
              )}
            </div>

            {/* Usage Limit + Expiry */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm placeholder:text-gray-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  Expires At
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-12 bg-success text-white font-display font-black uppercase tracking-tight text-sm border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
              ) : (
                <>🎟️ Create Coupon</>
              )}
            </button>
          </form>
        </div>

        {/* Active Coupons List */}
        <div className="mx-4 mt-6">
          <h2 className="font-display font-black text-sm uppercase tracking-tight mb-3 flex items-center gap-2 px-1">
            📋 Your Coupons
          </h2>

          {coupons.length === 0 ? (
            <div className="py-12 text-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
              <span className="text-5xl">🎫</span>
              <p className="text-black font-black uppercase tracking-tight mt-4">No coupons yet</p>
              <p className="text-black/60 text-sm font-bold mt-1">
                Create your first promo code above!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Coupon Card ──────────────────────────────────────────────────────────────
function CouponCard({
  coupon,
  onToggle,
  onDelete,
}: {
  coupon: Coupon;
  onToggle: (id: string, currentActive: boolean) => void;
  onDelete: (id: string, code: string) => void;
}) {
  const isExpired = coupon.expires_at
    ? new Date(coupon.expires_at).getTime() < Date.now()
    : false;

  const isLimitReached = coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit;

  const statusLabel = !coupon.is_active
    ? "Inactive"
    : isExpired
    ? "Expired"
    : isLimitReached
    ? "Limit Reached"
    : "Active";

  const statusStyle = !coupon.is_active || isExpired || isLimitReached
    ? "bg-zinc-200 text-black/40"
    : "bg-success/15 text-success";

  return (
    <div className={`bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_#000] ${(!coupon.is_active || isExpired) ? "opacity-60" : ""}`}>
      {/* Top row: code + status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-base tracking-tight bg-warning/20 border border-black px-2.5 py-0.5 shadow-[1px_1px_0px_0px_#000]">
            {coupon.code}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-black ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-wider mb-3">
        <div className="flex justify-between">
          <span className="text-black/50">Type:</span>
          <span className="text-black">
            {coupon.discount_type === "percentage"
              ? `${coupon.discount_value}% off`
              : `₹${coupon.discount_value} flat`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/50">Min Order:</span>
          <span className="text-black">₹{coupon.min_order_value}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-black/50">Used:</span>
          <span className="text-black">
            {coupon.times_used}
            {coupon.usage_limit !== null ? ` / ${coupon.usage_limit}` : " / ∞"}
          </span>
        </div>
        {coupon.max_discount_amount !== null && (
          <div className="flex justify-between">
            <span className="text-black/50">Max Disc:</span>
            <span className="text-black">₹{coupon.max_discount_amount}</span>
          </div>
        )}
        {coupon.expires_at && (
          <div className="flex justify-between col-span-2">
            <span className="text-black/50">Expires:</span>
            <span className={`${isExpired ? "text-danger" : "text-black"}`}>
              {new Date(coupon.expires_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex gap-2 pt-2 border-t border-dashed border-black/20">
        <button
          onClick={() => onToggle(coupon.id, coupon.is_active)}
          className={`flex-1 min-h-9 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer ${
            coupon.is_active
              ? "bg-warning/20 text-black"
              : "bg-success/20 text-success"
          }`}
        >
          {coupon.is_active ? "⏸️ Deactivate" : "▶️ Activate"}
        </button>
        <button
          onClick={() => onDelete(coupon.id, coupon.code)}
          className="px-4 min-h-9 text-xs font-black uppercase border-2 border-black bg-danger/10 text-danger shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}
