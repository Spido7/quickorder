"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, @typescript-eslint/no-explicit-any */

import {
  useReducer,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cafe, CartItem, Order } from "@/lib/types";
import { memo } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────
interface PublicMenuItem {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  category_id?: string | null;
}

interface Props {
  cafe: Pick<Cafe, "id" | "business_name" | "upi_id" | "has_seating">;
  items: PublicMenuItem[];
  categories: { id: string; name: string; sort_order: number }[];
  initialTable?: string;
}

// ─── Cart Reducer ─────────────────────────────────────────────────────────────
type CartAction =
  | { type: "ADD"; item: Omit<CartItem, "quantity"> }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" }
  | { type: "INIT"; cart: CartItem[] };

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
    case "INIT":
      return action.cart;
    case "CLEAR":
      return [];
  }
}

// ─── MenuItem Row ─────────────────────────────────────────────────────────────
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
    () => {
      if (!item.is_available) return;
      dispatch({ type: "ADD", item: { id: item.id, name: item.name, price: item.price } }),
      [dispatch, item]
    },
    [dispatch, item]
  );
  const remove = useCallback(
    () => dispatch({ type: "REMOVE", id: item.id }),
    [dispatch, item.id]
  );

  return (
    <div
      className={`flex items-center gap-4 py-4 border-b-2 border-black bg-white px-4 my-2 border-2 shadow-[2px_2px_0px_0px_#000] transition-all ${
        !item.is_available ? "opacity-50 grayscale" : ""
      }`}
    >
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-black font-display font-bold text-base leading-snug">{item.name}</p>
          {!item.is_available && (
            <span className="bg-black text-white px-2 py-0.5 text-[10px] uppercase font-black tracking-wider rounded-none border border-black shadow-[1px_1px_0px_0px_#000]">
              Sold Out
            </span>
          )}
        </div>
        <p className="text-accent font-sans font-bold text-sm mt-0.5">₹{item.price}</p>
      </div>

      {/* Qty controls */}
      {quantity === 0 ? (
        <button
          onClick={add}
          disabled={!item.is_available}
          aria-label={item.is_available ? `Add ${item.name}` : `${item.name} is Out of Stock`}
          className={
            item.is_available
              ? "w-10 h-10 bg-warning text-black text-xl font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
              : "px-3 py-1.5 bg-gray-300 text-gray-500 text-xs font-black uppercase tracking-wider border-2 border-black cursor-not-allowed flex items-center justify-center rounded-none shadow-none"
          }
        >
          {item.is_available ? "+" : "Out of Stock"}
        </button>
      ) : (
        <div className="flex items-center gap-2.5">
          <button
            onClick={remove}
            aria-label="Remove one"
            className="w-10 h-10 bg-white text-black text-xl font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <span className="w-5 text-center text-black font-bold text-base font-sans">
            {quantity}
          </span>
          <button
            onClick={add}
            aria-label="Add one more"
            className="w-10 h-10 bg-accent text-white text-xl font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
});

// ─── Printable Invoice / Receipt Component ───────────────────────────────────
function InvoiceReceipt({ order, businessName }: { order: Order; businessName: string }) {
  const formattedDate = useMemo(() => {
    try {
      return new Date(order.created_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return "";
    }
  }, [order.created_at]);

  const formattedScheduledDate = useMemo(() => {
    if (!order.scheduled_at) return "";
    try {
      return new Date(order.scheduled_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return "";
    }
  }, [order.scheduled_at]);

  const statusConfig = {
    pending: { label: "⏳ Pending Payment / Cooking", color: "bg-warning text-black border-black" },
    preparing: { label: "👨‍🍳 Cooking in Kitchen", color: "bg-accent-dim text-white border-black" },
    done: { label: "✅ Ready / Served", color: "bg-success text-white border-success" },
    cancelled: { label: "❌ Cancelled", color: "bg-danger text-white border-black" },
  };

  const status = statusConfig[order.order_status] || statusConfig.pending;

  return (
    <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000] text-black font-sans print:border-none print:shadow-none print:p-0 print:text-black">
      {/* Receipt Header */}
      <div className="text-center pb-4 border-b-2 border-dashed border-black">
        <h3 className="font-display font-extrabold text-xl uppercase tracking-tight text-black">{businessName}</h3>
        <p className="text-xs uppercase font-bold tracking-widest text-zinc-600 mt-0.5">Order Receipt</p>
      </div>

      {/* Meta Grid */}
      <div className="py-4 space-y-1.5 text-xs font-semibold uppercase tracking-wider border-b-2 border-dashed border-black text-black">
        <div className="flex justify-between">
          <span className="text-zinc-600">Order ID:</span>
          <span className="text-black">#{order.id.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Date:</span>
          <span className="text-black">{formattedDate}</span>
        </div>
        {order.scheduled_at && formattedScheduledDate && (
          <div className="flex justify-between text-purple-800 font-extrabold border-2 border-dashed border-black bg-purple-50 p-1.5 my-1.5">
            <span>📅 Scheduled:</span>
            <span>{formattedScheduledDate}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-zinc-600">Station:</span>
          <span className="text-black">{order.table_number === "0" || !order.table_number ? "Counter / Takeaway" : `Table ${order.table_number}`}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-zinc-600">Status:</span>
          <span className={`text-[10px] px-2 py-0.5 font-bold border-2 border-black ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="py-4 border-b-2 border-dashed border-black text-black">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2 flex justify-between">
          <span>Item</span>
          <span>Qty & Price</span>
        </div>
        <div className="space-y-2">
          {order.cart_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm font-bold text-black">
              <span className="font-display">{item.name}</span>
              <span className="font-mono text-black">
                {item.quantity} × ₹{item.price} = ₹{item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Discount / Total Amount */}
      {order.discount_amount && Number(order.discount_amount) > 0 ? (
        <div className="py-3 border-b-2 border-dashed border-black space-y-1 text-xs font-bold uppercase tracking-wider text-black">
          <div className="flex justify-between text-zinc-600">
            <span>Subtotal</span>
            <span className="font-mono text-black">₹{(Number(order.total_amount) + Number(order.discount_amount)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-success">
            <span>Discount Applied</span>
            <span className="font-mono text-success">-₹{Number(order.discount_amount).toFixed(2)}</span>
          </div>
        </div>
      ) : null}

      {/* Total Amount */}
      <div className="pt-4 flex justify-between items-center font-display font-black text-lg text-black">
        <span className="uppercase tracking-tight">Total Amount</span>
        <span className="font-mono text-black">₹{Number(order.total_amount).toFixed(2)}</span>
      </div>
    </div>
  );
}

// ─── Checkout Bottom Sheet ────────────────────────────────────────────────────
type CheckoutStep = "summary" | "submitted";

function CheckoutSheet({
  isOpen,
  onClose,
  cart,
  total,
  cafe,
  initialTable,
  onOrderPlaced,
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  cafe: Props["cafe"];
  initialTable?: string;
  onOrderPlaced: (order: Order) => void;
}) {
  const [step, setStep] = useState<CheckoutStep>("summary");
  const [identifier, setIdentifier] = useState(""); // table number or customer name
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Promo code states
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discountAmount: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Scheduling states
  const [scheduleOption, setScheduleOption] = useState<"now" | "later">("now");
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [customTimeInput, setCustomTimeInput] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentTime(Date.now());
      const timer = setInterval(() => {
        setCurrentTime(Date.now());
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  // Derived price breakdown
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, total - discount);

  // Reset sheet state whenever it opens
  useEffect(() => {
    if (isOpen) {
      setStep("summary");
      setPlacedOrder(null);
      setError(null);
      setLoading(false);
      setPromoCode("");
      setAppliedCoupon(null);
      setPromoError(null);
      setPromoSuccess(null);
      setScheduleOption("now");
      setScheduledTime(null);
      setCustomTimeInput("");
      setActivePreset(null);
      setSchedulingError(null);
      
      // Auto-set from search param if scanning table QR
      if (initialTable !== undefined) {
        setIdentifier(initialTable);
      } else {
        setIdentifier("");
      }

      // Small delay so animation completes before focusing
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen, initialTable]);

  const label = cafe.has_seating ? "Table Number" : "Your Name";
  const placeholder = cafe.has_seating ? "e.g. 4" : "e.g. Rahul";

  const handlePresetClick = (minutes: number) => {
    setActivePreset(minutes);
    const baseTime = currentTime || Date.now();
    const date = new Date(baseTime + minutes * 60000);
    setScheduledTime(date);
    setCustomTimeInput("");
    setSchedulingError(null);
  };

  const handleCustomTimeChange = (timeString: string) => {
    setActivePreset(null);
    setCustomTimeInput(timeString);
    if (!timeString) {
      setScheduledTime(null);
      setSchedulingError(null);
      return;
    }
    
    const [hours, minutes] = timeString.split(":").map(Number);
    const baseTime = currentTime || Date.now();
    const now = new Date(baseTime);
    const selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    
    if (selectedDate.getTime() < baseTime) {
      setScheduledTime(null);
      setSchedulingError("Please select a future time for today");
    } else {
      setScheduledTime(selectedDate);
      setSchedulingError(null);
    }
  };

  const hasValidSchedule = scheduleOption === "now" || (scheduledTime !== null && !schedulingError);
  const canPay = identifier.trim().length > 0 && !loading && hasValidSchedule;

  async function handleApplyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode.trim(),
          merchant_id: cafe.id,
          cart_subtotal: total,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate coupon.");
      }

      setAppliedCoupon({
        id: data.coupon_id,
        code: promoCode.trim().toUpperCase(),
        discountAmount: data.discount_amount,
      });
      setPromoSuccess(`Coupon applied! Saved ₹${data.discount_amount.toFixed(2)}`);
    } catch (err: any) {
      setPromoError(err.message || "Invalid coupon code.");
    } finally {
      setPromoLoading(false);
    }
  }

  function handleRemovePromo() {
    setAppliedCoupon(null);
    setPromoCode("");
    setPromoSuccess(null);
    setPromoError(null);
  }

  async function handleRazorpayCheckout() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Insert order into Supabase
      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert({
          cafe_id: cafe.id,
          table_number: identifier.trim(),
          total_amount: finalTotal,
          cart_items: cart,
          order_status: "pending",
          coupon_id: appliedCoupon ? appliedCoupon.id : null,
          discount_amount: discount,
          scheduled_at: scheduledTime ? scheduledTime.toISOString() : null,
        })
        .select()
        .single<Order>();

      if (insertError) throw insertError;
      if (!newOrder) throw new Error("Order creation returned no data");

      // 2. Initialize Razorpay Order dynamically from server API
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalTotal,
          orderId: newOrder.id,
          cafeId: cafe.id,
        }),
      });

      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res?.error || "Failed to initialize Razorpay payment. Please try again.");
      }

      // Run Razorpay Checkout modal
      const options = {
        key: res.keyId,
        amount: res.amount,
        currency: res.currency,
        name: cafe.business_name,
        description: `Order #${newOrder.id.slice(0, 8)}`,
        order_id: res.orderId,
        handler: async function (response: any) {
          setLoading(true);
          try {
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: newOrder.id,
                cafeId: cafe.id,
              }),
            });
            const verifyResult = await verifyResponse.json();
            if (verifyResult.success) {
              // Success! The verify route already updated database state to "preparing"
              const updatedOrder = { ...newOrder, order_status: "preparing" as any };
              setPlacedOrder(updatedOrder);
              setStep("submitted");
              onOrderPlaced(updatedOrder);
            } else {
              throw new Error(verifyResult.error || "Signature verification failed");
            }
          } catch (err: any) {
            setError(err.message || "Failed to verify payment signature.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#000000",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }


  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 print:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#f5f2eb] border-t-4 border-l-2 border-r-2 border-black rounded-none transition-transform duration-300 ease-out print:fixed print:inset-0 print:bg-white print:border-none print:shadow-none print:w-full print:h-full print:translate-y-0 print:z-50 print:overflow-visible ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 print:hidden">
          <div className="w-12 h-1.5 bg-black rounded-none" />
        </div>

        <div className="px-5 pb-8 pt-2 max-h-[85dvh] overflow-y-auto text-black print:p-0 print:max-h-none print:overflow-visible">
          {step === "submitted" && placedOrder ? (
            // ── Success state (Invoice Receipt) ──
            <div className="py-4 space-y-5">
              <div className="text-center print:hidden">
                <div className="w-14 h-14 bg-warning border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <h2 className="font-display font-black text-xl uppercase tracking-tight">Order Placed Successfully!</h2>
                <p className="text-sm font-semibold text-gray-700 mt-1">
                  Complete the payment using the prompt from your UPI app.
                </p>
              </div>

              {/* Printable Invoice */}
              <div id="receipt-print-area" className="print:block print:absolute print:inset-0 print:m-0 print:p-8 print:bg-white print:text-black print:z-50">
                <InvoiceReceipt order={placedOrder} businessName={cafe.business_name} />
              </div>

              {/* Action row */}
              <div className="grid grid-cols-1 gap-3 pt-2 print:hidden">
                <button
                  onClick={() => typeof window !== 'undefined' && window.print()}
                  className="min-h-12 border-2 border-black bg-accent text-white font-display font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer tracking-tight"
                >
                  📥 Download Receipt as PDF
                </button>
                <button
                  onClick={onClose}
                  className="min-h-12 border-2 border-black bg-white text-black font-bold text-sm shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
                >
                  ← Back to Menu
                </button>
              </div>

              <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest print:hidden">
                If UPI app did not open,{" "}
                <button
                  onClick={() => {
                    const stationName = placedOrder.table_number === "0" ? "Counter" : `Table ${placedOrder.table_number}`;
                    const link =
                      `upi://pay?pa=${encodeURIComponent(cafe.upi_id)}` +
                      `&pn=${encodeURIComponent(cafe.business_name)}` +
                      `&tr=${encodeURIComponent(placedOrder.id.replace(/-/g, ""))}` +
                      `&mc=5812` +
                      `&am=${placedOrder.total_amount.toFixed(2)}&cu=INR` +
                      `&tn=${encodeURIComponent("Order from " + (cafe.has_seating ? stationName : identifier.trim()))}`;
                    window.location.href = link;
                  }}
                  className="text-accent underline"
                >
                  tap here to retry
                </button>
              </p>
            </div>
          ) : (
            // ── Summary + payment form ──
            <>
              <h2 className="font-display font-black text-xl uppercase tracking-tight mb-0.5">Your Order</h2>
              <p className="text-accent-dim font-bold text-xs uppercase tracking-widest mb-4">{cafe.business_name}</p>

              {/* Cart items */}
              <div className="bg-white border-2 border-black rounded-none overflow-hidden mb-5 shadow-[3px_3px_0px_0px_#000]">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center px-4 py-3 border-b-2 border-black last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 border-2 border-black bg-warning text-black text-xs font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                      <span className="text-black font-display font-bold text-sm">{item.name}</span>
                    </div>
                    <span className="text-black font-bold font-sans text-sm">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}

                {/* Price Breakdown */}
                {appliedCoupon ? (
                  <>
                    <div className="flex justify-between items-center px-4 py-2 border-t-2 border-black bg-white text-xs font-bold text-black/60 uppercase">
                      <span>Subtotal</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2 border-t border-black bg-white text-xs font-bold text-success uppercase">
                      <span>Coupon ({appliedCoupon.code})</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  </>
                ) : null}

                {/* Total row */}
                <div className="flex justify-between items-center px-4 py-3 bg-[#fcbf49]/20 border-t-2 border-black">
                  <span className="text-black font-display font-black uppercase tracking-tight">Total</span>
                  <span className="text-accent font-black text-lg">₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="mb-5">
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                  Promo Code
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    disabled={promoLoading || appliedCoupon !== null}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="ENTER CODE"
                    className="flex-1 min-h-12 px-4 border-2 border-black bg-white text-black placeholder:text-gray-400 font-bold focus:outline-none focus:ring-0 focus:border-accent disabled:bg-gray-100 disabled:text-gray-500 rounded-none text-base uppercase"
                  />
                  {appliedCoupon !== null ? (
                    <button
                      onClick={handleRemovePromo}
                      className="px-4 bg-danger text-white font-display font-bold text-xs border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center cursor-pointer uppercase font-black"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="px-6 bg-warning text-black font-display font-black text-xs border-2 border-black shadow-[2px_2px_0px_0px_#000] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center cursor-pointer uppercase font-black"
                    >
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  )}
                </div>

                {/* Promo Messages */}
                {promoError && (
                  <p className="text-danger text-xs font-bold mt-1.5 uppercase tracking-wide">
                    ⚠️ {promoError}
                  </p>
                )}
                {promoSuccess && (
                  <p className="text-success text-xs font-bold mt-1.5 uppercase tracking-wide">
                    🎉 {promoSuccess}
                  </p>
                )}
              </div>

              {/* Scheduling Section */}
              <div className="mb-5 border-2 border-black p-3 bg-white shadow-[3px_3px_0px_0px_#000]">
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                  🕒 Schedule Order
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleOption("now");
                      setScheduledTime(null);
                      setActivePreset(null);
                      setCustomTimeInput("");
                      setSchedulingError(null);
                    }}
                    className={`py-2 text-xs font-black uppercase border-2 border-black tracking-wider transition-all cursor-pointer ${
                      scheduleOption === "now"
                        ? "bg-warning text-black shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white text-black hover:bg-zinc-50"
                    }`}
                  >
                    ⚡ Prepare Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleOption("later");
                    }}
                    className={`py-2 text-xs font-black uppercase border-2 border-black tracking-wider transition-all cursor-pointer ${
                      scheduleOption === "later"
                        ? "bg-accent text-white shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white text-black hover:bg-zinc-50"
                    }`}
                  >
                    📅 Schedule Later
                  </button>
                </div>

                {scheduleOption === "later" && (
                  <div className="space-y-3 pt-2 border-t-2 border-dashed border-black">
                    {/* Preset buttons */}
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Quick Presets (Today Only)
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[15, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handlePresetClick(mins)}
                            className={`py-1.5 px-1 text-[10px] font-black border border-black transition-all cursor-pointer truncate ${
                              activePreset === mins
                                ? "bg-warning text-black shadow-[1px_1px_0px_0px_#000]"
                                : "bg-zinc-50 text-black hover:bg-zinc-100"
                            }`}
                          >
                            +{mins}M
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom time picker */}
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Or Set Custom Time (Today Only)
                      </p>
                      <input
                        type="time"
                        value={customTimeInput}
                        onChange={(e) => handleCustomTimeChange(e.target.value)}
                        className="w-full min-h-10 px-3 border border-black bg-white text-black font-bold focus:outline-none focus:ring-0 focus:border-accent text-xs rounded-none"
                      />
                    </div>

                    {/* Verification label */}
                    {scheduledTime && !schedulingError && (
                      <div className="p-2 bg-green-50 border border-green-800 text-green-900 text-[10px] font-bold uppercase tracking-wider">
                        📅 Scheduled for Today at{" "}
                        <span className="font-black text-xs">
                          {scheduledTime.toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>{" "}
                        (approx. {Math.round((scheduledTime.getTime() - (currentTime || Date.now())) / 60000)} mins from now)
                      </div>
                    )}

                    {/* Scheduling Error */}
                    {schedulingError && (
                      <p className="text-danger text-[10px] font-bold uppercase tracking-wide">
                        ⚠️ {schedulingError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Identifier input */}
              <div className="mb-5">
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-2">
                  {label}
                </label>
                <input
                  ref={inputRef}
                  type={initialTable !== undefined ? "text" : (cafe.has_seating ? "number" : "text")}
                  disabled={initialTable !== undefined}
                  value={
                    initialTable !== undefined
                      ? (identifier === "0" ? "Counter (Table 0)" : `Table ${identifier}`)
                      : identifier
                  }
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={placeholder}
                  inputMode={cafe.has_seating ? "numeric" : "text"}
                  className="w-full min-h-12 px-4 border-2 border-black bg-white text-black placeholder:text-gray-400 font-bold focus:outline-none focus:ring-0 focus:border-accent disabled:bg-gray-100 disabled:text-gray-500 rounded-none text-base"
                />
                {initialTable !== undefined && (
                  <p className="text-[10px] text-gray-500 font-semibold mt-1.5 uppercase tracking-wide">
                    📍 Table set automatically from scanned QR code.
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 border-2 border-black bg-danger/10 text-danger text-sm font-bold">
                  {error}
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handleRazorpayCheckout}
                disabled={!canPay}
                className="w-full min-h-14 bg-accent text-white font-display font-black text-base border-2 border-black shadow-[4px_4px_0px_0px_#000] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <span>💳</span>
                    Pay ₹{finalTotal.toFixed(2)}
                  </>
                )}
              </button>

              <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-3">
                Processed securely via Razorpay
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Order History Bottom Sheet ──────────────────────────────────────────────
function OrderHistorySheet({
  isOpen,
  onClose,
  orders,
  businessName,
}: {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  businessName: string;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 print:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Order History"
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#f5f2eb] border-t-4 border-l-2 border-r-2 border-black rounded-none transition-transform duration-300 ease-out print:fixed print:inset-0 print:bg-white print:border-none print:shadow-none print:w-full print:h-full print:translate-y-0 print:z-50 print:overflow-visible ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-between items-center px-5 pt-4 pb-2 border-b-2 border-black print:hidden">
          <h2 className="font-display font-black text-lg uppercase tracking-tight">Active Orders &amp; Receipts</h2>
          <button onClick={onClose} className="font-black text-lg hover:text-accent cursor-pointer">✕</button>
        </div>

        <div className="px-5 py-6 max-h-[75dvh] overflow-y-auto space-y-6 text-black print:p-0 print:max-h-none print:overflow-visible">
          {orders.length === 0 ? (
            <div className="text-center py-10 print:hidden">
              <span className="text-4xl">🧾</span>
              <p className="font-bold text-zinc-600 mt-2 uppercase text-xs tracking-widest">No order history found</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="print:break-inside-avoid print:mb-8">
                <InvoiceReceipt order={order} businessName={businessName} />
                <button
                  onClick={() => typeof window !== 'undefined' && window.print()}
                  className="w-full mt-3 min-h-10 border-2 border-black bg-white hover:bg-gray-50 text-black font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer print:hidden"
                >
                  🖨️ Print Receipt
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function MenuClient({ cafe, items, categories, initialTable }: Props) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [placedOrders, setPlacedOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // 1. Initial cart local caching load
  useEffect(() => {
    const saved = localStorage.getItem(`quickorder:cart:${cafe.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatch({ type: "INIT", cart: parsed });
        }
      } catch (e) {
        console.error("Failed to parse cart local cache", e);
      }
    }
    setIsLoaded(true);
  }, [cafe.id]);

  // 2. Write cart state changes to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    if (cart.length > 0) {
      localStorage.setItem(`quickorder:cart:${cafe.id}`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`quickorder:cart:${cafe.id}`);
    }
  }, [cart, cafe.id, isLoaded]);

  // 3. Load placed orders history and fetch fresh status values on mount
  useEffect(() => {
    const saved = localStorage.getItem(`quickorder:orders:${cafe.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlacedOrders(parsed);

          // Auto-popup if latest order is active (pending or preparing)
          const hasActiveOrder = parsed.some(
            (o: Order) => o.order_status === "pending" || o.order_status === "preparing"
          );
          if (hasActiveOrder) {
            setHistoryOpen(true);
          }

          // Fetch fresh status from Supabase to prevent stale status tracking
          const supabase = createClient();
          const ids = parsed.map((o: Order) => o.id);
          supabase
            .from("orders")
            .select("*")
            .in("id", ids)
            .then(({ data }) => {
              if (data && data.length > 0) {
                setPlacedOrders((prev) => {
                  const updated = prev.map((o) => {
                    const match = data.find((d) => d.id === o.id);
                    return match ? { ...o, ...match } : o;
                  });
                  localStorage.setItem(`quickorder:orders:${cafe.id}`, JSON.stringify(updated));

                  // Re-check with fresh data
                  const freshActive = updated.some(
                    (o: Order) => o.order_status === "pending" || o.order_status === "preparing"
                  );
                  if (freshActive) {
                    setHistoryOpen(true);
                  }

                  return updated;
                });
              }
            });
        }
      } catch (e) {
        console.error("Failed to parse local orders", e);
      }
    }
  }, [cafe.id]);

  // 4. Supabase Realtime subscription for customer's own active orders
  useEffect(() => {
    if (placedOrders.length === 0) return;
    const supabase = createClient();
    const orderIds = placedOrders.map((o) => o.id);

    const channel = supabase
      .channel(`customer-orders-${cafe.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `cafe_id=eq.${cafe.id}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          if (orderIds.includes(updated.id)) {
            setPlacedOrders((prev) => {
              const next = prev.map((o) => (o.id === updated.id ? updated : o));
              localStorage.setItem(`quickorder:orders:${cafe.id}`, JSON.stringify(next));
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placedOrders.length, cafe.id]);

  const onOrderPlaced = (order: Order) => {
    setPlacedOrders((prev) => {
      const next = [order, ...prev];
      localStorage.setItem(`quickorder:orders:${cafe.id}`, JSON.stringify(next));
      return next;
    });
    dispatch({ type: "CLEAR" });
  };

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

  const filteredItems = useMemo(() => {
    return activeCategory === "All"
      ? items
      : items.filter((item) => item.category_id === activeCategory);
  }, [activeCategory, items]);

  return (
    <div className="min-h-dvh flex flex-col bg-background max-w-md mx-auto border-x-4 border-black print:border-none print:bg-white print:max-w-none print:h-auto">
      {/* Printable Area Wrapper: Hide regular elements when printing */}
      
      {/* ── Header ── */}
      <header className="relative z-10 bg-accent text-white border-b-4 border-black shadow-[0_4px_0_0_#000] px-5 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-lg uppercase tracking-tight leading-none">
              {cafe.business_name}
            </h1>
            <p className="text-white/80 text-[10px] uppercase font-bold tracking-widest mt-1">
              {items.length} item{items.length !== 1 ? "s" : ""} available
            </p>
          </div>
          {placedOrders.length > 0 && (
            <button
              onClick={() => setHistoryOpen(true)}
              className="px-3 py-1.5 bg-warning text-black border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              🧾 Orders ({placedOrders.length})
            </button>
          )}
        </div>
      </header>

      {/* ── Sticky Category Bar ── */}
      {items.length > 0 && (
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm py-4 border-b-4 border-black overflow-x-auto whitespace-nowrap hide-scrollbar px-4 flex gap-3 print:hidden">
          <button
            onClick={() => setActiveCategory("All")}
            className={`border-4 border-black px-4 py-2 text-sm font-black uppercase transition-all cursor-pointer rounded-none ${
              activeCategory === "All"
                ? "bg-warning text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-x-0.5 -translate-y-0.5"
                : "bg-white text-black hover:bg-zinc-100"
            }`}
          >
            All
          </button>
          {categories.map((category) => {
            const hasItems = items.some((item) => item.category_id === category.id);
            if (!hasItems) return null;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`border-4 border-black px-4 py-2 text-sm font-black uppercase transition-all cursor-pointer rounded-none ${
                  activeCategory === category.id
                    ? "bg-warning text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-x-0.5 -translate-y-0.5"
                    : "bg-white text-black hover:bg-zinc-100"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active Order Banner ── */}
      {placedOrders.length > 0 && (
        <div className="mx-4 mt-5 bg-warning/20 border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000] flex items-center justify-between text-black print:hidden">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">🔔</span>
            <div>
              <p className="font-display font-black text-sm uppercase leading-tight">Active Orders Placed</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mt-0.5">
                Live Status: {placedOrders[0].order_status === "pending" ? "Cooking soon" : placedOrders[0].order_status}
              </p>
            </div>
          </div>
          <button
            onClick={() => setHistoryOpen(true)}
            className="px-2.5 py-1 bg-black text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
          >
            Track Status
          </button>
        </div>
      )}

      {/* ── Menu list ── */}
      <main className="flex-1 px-4 py-4 pb-32 print:hidden">
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] my-4 p-8">
            <span className="text-5xl">🍽️</span>
            <p className="font-display font-black text-xl uppercase mt-4 text-black">No items found</p>
            <p className="text-gray-500 font-semibold text-sm mt-1 leading-relaxed">
              No items are available in this category.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category) => {
              const categoryItems = filteredItems.filter((item) => item.category_id === category.id);
              if (categoryItems.length === 0) return null;
              return (
                <div key={category.id} className="space-y-2">
                  <h2 className="font-display font-black text-base uppercase tracking-tight text-black border-b-2 border-black pb-1 mt-4">
                    {category.name}
                  </h2>
                  <div className="space-y-1">
                    {categoryItems.map((item) => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        quantity={quantityMap[item.id] ?? 0}
                        dispatch={dispatch}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized Items */}
            {(() => {
              const uncategorizedItems = filteredItems.filter(
                (item) => !item.category_id || !categories.some((c) => c.id === item.category_id)
              );
              if (uncategorizedItems.length === 0) return null;
              return (
                <div className="space-y-2">
                  <h2 className="font-display font-black text-base uppercase tracking-tight text-black border-b-2 border-black pb-1 mt-4">
                    Other Items
                  </h2>
                  <div className="space-y-1">
                    {uncategorizedItems.map((item) => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        quantity={quantityMap[item.id] ?? 0}
                        dispatch={dispatch}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* ── Cart FAB ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 z-30 print:hidden ${
          cartCount > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setCheckoutOpen(true)}
          className="w-full min-h-16 bg-warning text-black font-display font-black text-base border-2.5 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-between px-5 cursor-pointer"
        >
          {/* Left: item count badge */}
          <span className="w-8 h-8 border-2 border-black bg-white text-sm font-black flex items-center justify-center font-sans">
            {cartCount}
          </span>

          {/* Center: label */}
          <span className="uppercase tracking-tight">View Cart &amp; Checkout</span>

          {/* Right: total */}
          <span className="font-sans font-black text-lg">₹{total}</span>
        </button>
      </div>

      {/* ── Checkout Bottom Sheet ── */}
      <CheckoutSheet
        isOpen={checkoutOpen}
        onClose={handleCheckoutClose}
        cart={cart}
        total={total}
        cafe={cafe}
        initialTable={initialTable}
        onOrderPlaced={onOrderPlaced}
      />

      {/* ── Order History Bottom Sheet ── */}
      <OrderHistorySheet
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        orders={placedOrders}
        businessName={cafe.business_name}
      />

      {/* Embedded Print stylesheet rules */}
      <style>{`
        @media print {
          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            margin: 10mm;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}
