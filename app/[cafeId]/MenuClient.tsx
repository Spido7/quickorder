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
import type { Cafe, CartItem, Order } from "@/lib/types";
import { memo } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────
interface PublicMenuItem {
  id: string;
  name: string;
  price: number;
}

interface Props {
  cafe: Pick<Cafe, "id" | "business_name" | "upi_id" | "has_seating">;
  items: PublicMenuItem[];
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
    () => dispatch({ type: "ADD", item: { id: item.id, name: item.name, price: item.price } }),
    [dispatch, item]
  );
  const remove = useCallback(
    () => dispatch({ type: "REMOVE", id: item.id }),
    [dispatch, item.id]
  );

  return (
    <div className="flex items-center gap-4 py-4 border-b-2 border-black bg-white px-4 my-2 border-2 shadow-[2px_2px_0px_0px_#000]">
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <p className="text-black font-display font-bold text-base leading-snug">{item.name}</p>
        <p className="text-accent font-sans font-bold text-sm mt-0.5">₹{item.price}</p>
      </div>

      {/* Qty controls */}
      {quantity === 0 ? (
        <button
          onClick={add}
          aria-label={`Add ${item.name}`}
          className="w-10 h-10 bg-warning text-black text-xl font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
        >
          +
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

  const statusConfig = {
    pending: { label: "⏳ Pending Payment / Cooking", color: "bg-warning text-black" },
    preparing: { label: "👨‍🍳 Cooking in Kitchen", color: "bg-accent-dim text-white" },
    done: { label: "✅ Ready / Served", color: "bg-success text-white border-success" },
    cancelled: { label: "❌ Cancelled", color: "bg-danger text-white" },
  };

  const status = statusConfig[order.order_status] || statusConfig.pending;

  return (
    <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000] text-black font-sans print:border-none print:shadow-none print:p-0 print:text-black">
      {/* Receipt Header */}
      <div className="text-center pb-4 border-b-2 border-dashed border-black">
        <h3 className="font-display font-extrabold text-xl uppercase tracking-tight">{businessName}</h3>
        <p className="text-xs uppercase font-bold tracking-widest text-gray-500 mt-0.5">Order Receipt</p>
      </div>

      {/* Meta Grid */}
      <div className="py-4 space-y-1.5 text-xs font-semibold uppercase tracking-wider border-b-2 border-dashed border-black">
        <div className="flex justify-between">
          <span className="text-gray-500">Order ID:</span>
          <span>#{order.id.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Date:</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Station:</span>
          <span>{order.table_number === "0" || !order.table_number ? "Counter / Takeaway" : `Table ${order.table_number}`}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-gray-500">Status:</span>
          <span className={`text-[10px] px-2 py-0.5 font-bold border-2 border-black ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="py-4 border-b-2 border-dashed border-black">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex justify-between">
          <span>Item</span>
          <span>Qty & Price</span>
        </div>
        <div className="space-y-2">
          {order.cart_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm font-bold">
              <span className="font-display">{item.name}</span>
              <span className="font-mono">
                {item.quantity} × ₹{item.price} = ₹{item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total Amount */}
      <div className="pt-4 flex justify-between items-center font-display font-black text-lg">
        <span className="uppercase tracking-tight">Total Amount</span>
        <span className="font-mono">₹{order.total_amount}</span>
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

  // Reset sheet state whenever it opens
  useEffect(() => {
    if (isOpen) {
      setStep("summary");
      setPlacedOrder(null);
      setError(null);
      setLoading(false);
      
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
  const canPay = identifier.trim().length > 0 && !loading;

  async function handlePay() {
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
          total_amount: total,
          cart_items: cart,
          order_status: "pending",
        })
        .select()
        .single<Order>();

      if (insertError) throw insertError;
      if (!newOrder) throw new Error("Order creation returned no data");

      setPlacedOrder(newOrder);
      setStep("submitted");
      onOrderPlaced(newOrder);

      // 2. Build UPI deep link and redirect
      const stationName = newOrder.table_number === "0"
        ? "Counter"
        : `Table ${newOrder.table_number}`;
      
      const upiLink =
        `upi://pay` +
        `?pa=${encodeURIComponent(cafe.upi_id)}` +
        `&pn=${encodeURIComponent(cafe.business_name)}` +
        `&tr=${encodeURIComponent(newOrder.id.replace(/-/g, ""))}` +
        `&mc=5812` +
        `&am=${total.toFixed(2)}` +
        `&cu=INR` +
        `&tn=${encodeURIComponent("Order from " + (cafe.has_seating ? stationName : identifier.trim()))}`;

      // Small delay so user sees the success state before the OS dialog appears
      setTimeout(() => {
        window.location.href = upiLink;
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const printReceipt = () => {
    window.print();
  };

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
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#f5f2eb] border-t-4 border-l-2 border-r-2 border-black rounded-none transition-transform duration-300 ease-out print:hidden ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-black rounded-none" />
        </div>

        <div className="px-5 pb-8 pt-2 max-h-[85dvh] overflow-y-auto text-black">
          {step === "submitted" && placedOrder ? (
            // ── Success state (Invoice Receipt) ──
            <div className="py-4 space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 bg-warning border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <h2 className="font-display font-black text-xl uppercase tracking-tight">Order Placed Successfully!</h2>
                <p className="text-sm font-semibold text-gray-700 mt-1">
                  Complete the payment using the prompt from your UPI app.
                </p>
              </div>

              {/* Printable Invoice */}
              <InvoiceReceipt order={placedOrder} businessName={cafe.business_name} />

              {/* Action row */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={printReceipt}
                  className="min-h-12 border-2 border-black bg-white text-black font-bold text-sm shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🖨️ Print Invoice
                </button>
                <button
                  onClick={onClose}
                  className="min-h-12 border-2 border-black bg-accent text-white font-bold text-sm shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
                >
                  Back to Menu
                </button>
              </div>

              <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                If UPI app did not open,{" "}
                <button
                  onClick={() => {
                    const stationName = placedOrder.table_number === "0" ? "Counter" : `Table ${placedOrder.table_number}`;
                    const link =
                      `upi://pay?pa=${encodeURIComponent(cafe.upi_id)}` +
                      `&pn=${encodeURIComponent(cafe.business_name)}` +
                      `&tr=${encodeURIComponent(placedOrder.id.replace(/-/g, ""))}` +
                      `&mc=5812` +
                      `&am=${total.toFixed(2)}&cu=INR` +
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

                {/* Total row */}
                <div className="flex justify-between items-center px-4 py-3 bg-[#fcbf49]/20 border-t-2 border-black">
                  <span className="text-black font-display font-black uppercase tracking-tight">Total</span>
                  <span className="text-accent font-black text-lg">₹{total}</span>
                </div>
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
                onClick={handlePay}
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
                    Pay ₹{total} via UPI
                  </>
                )}
              </button>

              <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-3">
                Opens GPay, PhonePe, Paytm or any UPI app
              </p>
              <div className="mt-4 p-2.5 border border-black/20 bg-warning/10 text-black/75 text-[10px] font-bold leading-normal uppercase tracking-wide rounded-none text-center">
                💡 Note: If the amount is not pre-filled in your UPI app, please type <span className="text-accent font-black">₹{total}</span> manually. UPI restricts auto-filling for personal accounts.
              </div>
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
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#f5f2eb] border-t-4 border-l-2 border-r-2 border-black rounded-none transition-transform duration-300 ease-out print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:border-none print:shadow-none ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-between items-center px-5 pt-4 pb-2 border-b-2 border-black print:hidden">
          <h2 className="font-display font-black text-lg uppercase tracking-tight">Active Orders &amp; Receipts</h2>
          <button onClick={onClose} className="font-black text-lg hover:text-accent cursor-pointer">✕</button>
        </div>

        <div className="px-5 py-6 max-h-[75dvh] overflow-y-auto space-y-6 text-black print:p-0">
          {orders.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-4xl">🧾</span>
              <p className="font-bold text-gray-500 mt-2 uppercase text-xs tracking-widest">No order history found</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="print:break-inside-avoid">
                <InvoiceReceipt order={order} businessName={businessName} />
                <button
                  onClick={() => window.print()}
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
export default function MenuClient({ cafe, items, initialTable }: Props) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [placedOrders, setPlacedOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

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

  return (
    <div className="min-h-dvh flex flex-col bg-background max-w-md mx-auto border-x-4 border-black print:border-none print:bg-white print:max-w-none print:h-auto">
      {/* Printable Area Wrapper: Hide regular elements when printing */}
      
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-accent text-white border-b-4 border-black shadow-[0_4px_0_0_#000] px-5 py-4 print:hidden">
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
        {items.length === 0 ? (
          <div className="py-20 text-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] my-4 p-8">
            <span className="text-5xl">🍽️</span>
            <p className="font-display font-black text-xl uppercase mt-4 text-black">Menu coming soon</p>
            <p className="text-gray-500 font-semibold text-sm mt-1 leading-relaxed">
              The kitchen is getting ready. Check back shortly!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
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
      <style jsx global>{`
        @media print {
          body, html, #__next, main, header, div {
            background: white !important;
            color: black !important;
          }
          /* Hide everything except the dialog or active print component */
          body > * {
            display: none !important;
          }
          /* Explicitly render only the history sheet contents or last receipt when printing */
          [role="dialog"] {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          [role="dialog"] > div {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Hide inputs, close icons, backdrops, and action buttons during print */
          .print\\:hidden, button, input, [role="switch"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
