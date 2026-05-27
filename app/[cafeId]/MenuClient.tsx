"use client";

import {
  useReducer,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cafe, CartItem } from "@/lib/types";

// ─── Props ────────────────────────────────────────────────────────────────────
interface PublicMenuItem {
  id: string;
  name: string;
  price: number;
}

interface Props {
  cafe: Pick<Cafe, "id" | "business_name" | "upi_id" | "has_seating">;
  items: PublicMenuItem[];
}

// ─── Cart Reducer ─────────────────────────────────────────────────────────────
// Using useReducer keeps cart mutations stable and avoids stale-closure bugs
// in the item row callbacks.

type CartAction =
  | { type: "ADD"; item: Omit<CartItem, "quantity"> }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD": {
      const existing = state.find((i) => i.id === action.item.id);
      if (existing) {
        return state.map((i) =>
          i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...state, { ...action.item, quantity: 1 }];
    }
    case "REMOVE": {
      return state
        .map((i) => (i.id === action.id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
    }
    case "CLEAR":
      return [];
  }
}

// ─── MenuItem Row ─────────────────────────────────────────────────────────────
// Wrapped in React.memo to skip re-renders when unrelated cart items change.
// dispatch is stable across renders so it's safe to pass as a prop.

import { memo } from "react";

const MenuItemRow = memo(function MenuItemRow({
  item,
  quantity,
  dispatch,
}: {
  item: PublicMenuItem;
  quantity: number;
  dispatch: React.Dispatch<CartAction>;
}) {
  const add = useCallback(
    () => dispatch({ type: "ADD", item: { id: item.id, name: item.name, price: item.price } }),
    [dispatch, item]
  );
  const remove = useCallback(
    () => dispatch({ type: "REMOVE", id: item.id }),
    [dispatch, item.id]
  );

  return (
    <div className="flex items-center gap-3 py-4 border-b border-white/5 last:border-0">
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-base leading-snug">{item.name}</p>
        <p className="text-orange-400 font-semibold text-sm mt-0.5">₹{item.price}</p>
      </div>

      {/* Qty controls */}
      {quantity === 0 ? (
        <button
          onClick={add}
          aria-label={`Add ${item.name}`}
          className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xl font-light flex items-center justify-center transition-all active:scale-90 hover:bg-orange-500/25"
        >
          +
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={remove}
            aria-label="Remove one"
            className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 text-white text-xl font-light flex items-center justify-center transition-all active:scale-90 hover:bg-white/15"
          >
            −
          </button>
          <span className="w-6 text-center text-white font-bold text-base tabular-nums">
            {quantity}
          </span>
          <button
            onClick={add}
            aria-label="Add one more"
            className="w-10 h-10 rounded-xl bg-orange-500 text-white text-xl font-light flex items-center justify-center shadow-md shadow-orange-500/30 transition-all active:scale-90 hover:brightness-110"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
});

// ─── Checkout Bottom Sheet ────────────────────────────────────────────────────

type CheckoutStep = "summary" | "submitted";

function CheckoutSheet({
  isOpen,
  onClose,
  cart,
  total,
  cafe,
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  cafe: Props["cafe"];
}) {
  const [step, setStep] = useState<CheckoutStep>("summary");
  const [identifier, setIdentifier] = useState(""); // table number or customer name
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset sheet state whenever it opens
  useEffect(() => {
    if (isOpen) {
      setStep("summary");
      setIdentifier("");
      setError(null);
      setLoading(false);
      // Small delay so animation completes before focusing
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const label = cafe.has_seating ? "Table Number" : "Your Name";
  const placeholder = cafe.has_seating ? "e.g. 4" : "e.g. Rahul";
  const canPay = identifier.trim().length > 0 && !loading;

  async function handlePay() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Insert order into Supabase
      const { error: insertError } = await supabase.from("orders").insert({
        cafe_id: cafe.id,
        table_number: identifier.trim(),
        total_amount: total,
        cart_items: cart,
        order_status: "pending",
      });

      if (insertError) throw insertError;

      setStep("submitted");

      // 2. Build UPI deep link and redirect
      const upiLink =
        `upi://pay` +
        `?pa=${encodeURIComponent(cafe.upi_id).replace(/%40/g, "@")}` +
        `&pn=${encodeURIComponent(cafe.business_name)}` +
        `&am=${total.toFixed(2)}` +
        `&cu=INR` +
        `&tn=${encodeURIComponent("Order from " + (cafe.has_seating ? "Table " + identifier.trim() : identifier.trim()))}`;

      // Small delay so user sees the success state before the OS dialog appears
      setTimeout(() => {
        window.location.href = upiLink;
      }, 400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#16161a] border border-white/10 rounded-t-3xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/15 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-2 max-h-[85dvh] overflow-y-auto">
          {step === "submitted" ? (
            // ── Success state ──
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-white font-bold text-xl">Order Placed!</h2>
              <p className="text-white/50 text-sm mt-2 leading-relaxed">
                Your order is confirmed. Complete the payment on your UPI app.
              </p>
              <p className="text-white/30 text-xs mt-4">
                If your UPI app didn&apos;t open,{" "}
                <button
                  onClick={() => {
                    const link =
                      `upi://pay?pa=${encodeURIComponent(cafe.upi_id).replace(/%40/g, "@")}` +
                      `&pn=${encodeURIComponent(cafe.business_name)}` +
                      `&am=${total.toFixed(2)}&cu=INR`;
                    window.location.href = link;
                  }}
                  className="text-orange-400 underline"
                >
                  tap here to retry
                </button>
                .
              </p>
            </div>
          ) : (
            // ── Summary + payment form ──
            <>
              <h2 className="text-white font-bold text-lg mb-1">Your Order</h2>
              <p className="text-white/40 text-sm mb-4">{cafe.business_name}</p>

              {/* Cart items */}
              <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden mb-5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center px-4 py-3 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                      <span className="text-white/80 text-sm">{item.name}</span>
                    </div>
                    <span className="text-white font-medium text-sm">
                      ₹{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}

                {/* Total row */}
                <div className="flex justify-between items-center px-4 py-3 bg-white/3 border-t border-white/8">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-orange-400 font-bold text-lg">₹{total}</span>
                </div>
              </div>

              {/* Identifier input */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-white/60 mb-2">
                  {label}
                </label>
                <input
                  ref={inputRef}
                  type={cafe.has_seating ? "number" : "text"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={placeholder}
                  inputMode={cafe.has_seating ? "numeric" : "text"}
                  className="w-full min-h-14 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-base"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={!canPay}
                className="w-full min-h-14 rounded-2xl bg-orange-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all hover:brightness-110 flex items-center justify-center gap-3 shadow-xl shadow-orange-500/25"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <span className="text-xl">₹</span>
                    Pay ₹{total} via UPI
                  </>
                )}
              </button>

              <p className="text-center text-white/25 text-xs mt-3">
                Opens GPay, PhonePe, Paytm or any UPI app
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function MenuClient({ cafe, items }: Props) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Stable quantity lookup map so each MenuItemRow reads its own qty efficiently
  const quantityMap = useMemo(
    () => Object.fromEntries(cart.map((i) => [i.id, i.quantity])),
    [cart]
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart]
  );

  function handleCheckoutClose() {
    setCheckoutOpen(false);
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#0d0d0f] max-w-md mx-auto">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[#0d0d0f]/90 backdrop-blur-sm border-b border-white/5">
        <div className="px-5 py-4">
          <h1 className="text-white font-bold text-lg leading-tight">
            {cafe.business_name}
          </h1>
          <p className="text-white/40 text-xs mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </header>

      {/* ── Menu list ── */}
      <main className="flex-1 px-5 pb-32">
        {items.length === 0 ? (
          <div className="py-20 text-center">
            <span className="text-5xl">🍽️</span>
            <p className="text-white font-semibold mt-4">Menu coming soon</p>
            <p className="text-white/40 text-sm mt-1">
              The kitchen is getting ready. Check back shortly!
            </p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                quantity={quantityMap[item.id] ?? 0}
                dispatch={dispatch}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Cart FAB ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-30 transition-all duration-300 ${
          cartCount > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setCheckoutOpen(true)}
          className="w-full min-h-16 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-2xl shadow-orange-500/40 active:scale-[0.98] transition-all hover:brightness-110 flex items-center justify-between px-5"
        >
          {/* Left: item count badge */}
          <span className="w-7 h-7 rounded-lg bg-white/20 text-sm font-bold flex items-center justify-center tabular-nums">
            {cartCount}
          </span>

          {/* Center: label */}
          <span>View Cart &amp; Checkout</span>

          {/* Right: total */}
          <span className="font-bold text-white/90">₹{total}</span>
        </button>
      </div>

      {/* ── Checkout Bottom Sheet ── */}
      <CheckoutSheet
        isOpen={checkoutOpen}
        onClose={handleCheckoutClose}
        cart={cart}
        total={total}
        cafe={cafe}
      />
    </div>
  );
}
