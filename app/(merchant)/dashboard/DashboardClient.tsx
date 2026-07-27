"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem, Order } from "@/lib/types";
import KotTemplate from "./KotTemplate";
import CustomerBillTemplate from "./CustomerBillTemplate";

export const runtime = "edge";
export const dynamic = "force-dynamic";


// ─── Audio hook ───────────────────────────────────────────────────────────────
// Browsers block autoplay until the user interacts with the page.
// We expose `unlocked` + `unlock()` so the UI can show a one-time prompt.
function useAudioAlert(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio(src);
    audioRef.current.preload = "auto";
  }, [src]);

  // Called once when merchant taps "Enable Alerts"
  // Must be invoked directly inside a user-gesture handler so both
  // Notification.requestPermission() and Audio autoplay are allowed by the browser.
  const unlock = useCallback(() => {
    // 1. Request native notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    // 2. Silent play/pause on a fresh Audio object to unlock the browser's
    //    autoplay policy (works even if the main audioRef hasn't loaded yet)
    const audio = new Audio('/bell.mp3');
    audio.play().catch(() => {});
    audio.pause();

    // 3. Also unlock the persistent ref used for real bell rings
    const a = audioRef.current;
    if (a) {
      a.volume = 0;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = 1;
      }).catch(() => {});
    }

    // 4. Hide the banner — runs regardless of whether the user grants permission
    setUnlocked(true);
  }, []);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a || !unlocked) return;
    a.currentTime = 0;
    a.play().catch(() => null); // silently ignore if still blocked
  }, [unlocked]);

  return { unlocked, unlock, play };
}

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

// ─── Menu Item Row ────────────────────────────────────────────────────────────
function MenuItemRow({ item, onToggle, onEdit }: {
  item: MenuItem;
  onToggle: (id: string, val: boolean) => Promise<void>;
  onEdit: (item: MenuItem) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function handleToggle(val: boolean) {
    setBusy(true); await onToggle(item.id, val); setBusy(false);
  }
  return (
    <div className="flex items-center gap-4 px-4 py-4 min-h-[72px] bg-white text-black h-full">
      <div className="flex-1 min-w-0">
        <p className={`font-black text-base uppercase tracking-tight truncate ${item.is_available ? "text-black" : "text-black/40 line-through"}`}>{item.name}</p>
        <p className="text-accent font-black text-sm mt-0.5">₹{item.price}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 border-2 border-black bg-zinc-100 hover:bg-warning hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[1px] active:translate-y-[1px] shadow-[1px_1px_0px_0px_#000] active:shadow-none transition-all cursor-pointer font-bold text-xs"
          title="Edit item"
        >
          ✏️
        </button>
        <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000] ${item.is_available ? "bg-success/20 text-success" : "bg-zinc-100 text-zinc-400"}`}>
          {item.is_available ? "Live" : "Off"}
        </span>
        <ToggleSwitch checked={item.is_available} onChange={handleToggle} disabled={busy} />
      </div>
    </div>
  );
}

// ─── Regular Order Card (Preparing / Done) ────────────────────────────────────
const OrderCard = memo(function OrderCard({ order, onStatusChange, onAcceptAndCook }: {
  order: Order;
  onStatusChange: (id: string, status: Order["order_status"]) => void;
  onAcceptAndCook?: (order: Order) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [timeText, setTimeText] = useState("");
  const [isOverTime, setIsOverTime] = useState(false);
  const isCompleted = order.order_status === "done";
  const [isExpanded, setIsExpanded] = useState(!isCompleted);

  useEffect(() => {
    const updateTime = () => {
      const formatDuration = (ms: number): string => {
        const absMs = Math.abs(ms);
        const totalMins = Math.floor(absMs / 60000);
        if (totalMins < 1) return "0m";

        const mins = totalMins % 60;
        const totalHours = Math.floor(totalMins / 60);
        const hours = totalHours % 24;
        const days = Math.floor(totalHours / 24);

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

        return parts.join(" ");
      };

      if (order.scheduled_at) {
        const scheduledTime = new Date(order.scheduled_at).getTime();
        const diffMs = scheduledTime - Date.now();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMs > 0) {
          setTimeText(
            `Scheduled in ${formatDuration(diffMs)} (${new Date(order.scheduled_at).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })})`
          );
          setIsOverTime(false);
        } else {
          setTimeText(`Due ${formatDuration(diffMs)} ago`);
          setIsOverTime(Math.abs(diffMins) >= 5);
        }
      } else {
        const diffMs = Date.now() - new Date(order.created_at).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {
          setTimeText(`0m ago`);
          setIsOverTime(false);
        } else {
          setTimeText(`${formatDuration(diffMs)} ago`);
          setIsOverTime(diffMins >= 5);
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [order.created_at, order.scheduled_at]);

  const handleAction = async (nextStatus: Order["order_status"]) => {
    setBusy(true);
    await onStatusChange(order.id, nextStatus);
    setBusy(false);
  };

  const orderId = order.id.slice(0, 4).toUpperCase();
  const customerName = order.customer_name || "Guest";
  const location = order.fulfillment_type === "room_delivery"
    ? `Room ${order.hostel_block || "X"}-${order.room_number || "Y"}`
    : order.table_number === "0" || !order.table_number
      ? "Counter"
      : `Table ${order.table_number}`;

  if (isCompleted && !isExpanded) {
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        className="border-4 border-black bg-zinc-50 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black rounded-none flex items-center justify-between cursor-pointer hover:bg-zinc-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all select-none"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black uppercase bg-zinc-200 border-2 border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            {location}
          </span>
          {order.scheduled_at && (
            <span className="text-[10px] font-black uppercase bg-purple-200 text-purple-900 border-2 border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              📅 Scheduled
            </span>
          )}
          <h3 className="font-display font-black text-black text-sm uppercase tracking-tight">
            #ORD-{orderId}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display font-black text-black text-base">₹{order.total_amount}</p>
          <span className="text-black font-black text-xs border-2 border-black bg-white px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
            EXPAND ▼
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black rounded-none flex flex-col justify-between h-full transition-all ${
        isCompleted 
          ? "bg-zinc-50/90 cursor-pointer hover:bg-zinc-50 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none" 
          : "bg-white"
      }`}
      onClick={isCompleted ? () => setIsExpanded(false) : undefined}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-display font-black text-black text-sm sm:text-base uppercase tracking-tight truncate max-w-[200px]">
              #ORD-{orderId} - {customerName}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-black uppercase bg-zinc-100 border-2 border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                {location}
              </span>
              {order.scheduled_at && (
                <span className="text-[10px] font-black uppercase bg-purple-200 text-purple-900 border-2 border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  📅 Scheduled
                </span>
              )}
              <span className={`text-xs font-bold ${isOverTime ? 'text-red-600 font-black' : 'text-black/60'}`}>
                {timeText}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p className="font-display font-black text-black text-xl">₹{order.total_amount}</p>
            {isCompleted && (
              <span className="text-black font-black text-xs border-2 border-black bg-white px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 select-none">
                COLLAPSE ▲
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-black my-3" />

        {/* Cart items list in CSS Grid */}
        <div className="space-y-2 mb-4">
          {order.cart_items.map((item) => (
            <div key={item.id} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
              {/* Column 1: Qty with solid yellow background, bold text, no internal borders */}
              <span className="w-7 h-7 bg-warning text-black text-xs font-black flex items-center justify-center shrink-0">
                {item.quantity}x
              </span>
              {/* Column 2: Item name, left-aligned, bold text */}
              <span className="text-black text-sm font-black text-left uppercase truncate">
                {item.name}
              </span>
              {/* Column 3: Price, right-aligned, standard font */}
              <span className="text-black text-sm font-mono font-bold text-right shrink-0">
                ₹{item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action button / Badge */}
      <div className="mt-auto pt-2" onClick={(e) => {
        if (isCompleted) {
          e.stopPropagation();
        }
      }}>
        {order.order_status === "pending" && (
          <button
            onClick={() => onAcceptAndCook ? onAcceptAndCook(order) : handleAction("preparing")}
            disabled={busy}
            className="w-full min-h-12 bg-green-800 text-white font-display font-black uppercase tracking-tight text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {busy ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>✅ ACCEPT &amp; COOK</>
            )}
          </button>
        )}

        {order.order_status === "preparing" && (
          <button
            onClick={() => handleAction("done")}
            disabled={busy}
            className="w-full min-h-12 bg-blue-500 text-black font-display font-black uppercase tracking-tight text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {busy ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>🚀 MARK AS READY</>
            )}
          </button>
        )}

        {order.order_status === "done" && (
          <div className="w-full min-h-10 bg-zinc-100 text-black font-display font-black uppercase tracking-tight text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 select-none">
            ☑️ Done
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
type Tab = "orders" | "menu";
type SortOption = "default" | "newest" | "oldest" | "price-desc" | "price-asc";

function TabBar({ active, onChange, pendingCount }: {
  active: Tab; onChange: (t: Tab) => void; pendingCount: number;
}) {
  return (
    <div className="no-print flex border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] rounded-none overflow-hidden mx-4 md:mx-6 mb-4 p-0">
      {(["orders", "menu"] as Tab[]).map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={`flex-1 min-h-11 font-display font-black uppercase text-sm border-r-2 border-black last:border-r-0 rounded-none relative transition-colors cursor-pointer ${
            active === t ? "bg-warning text-black font-black" : "bg-white text-black/60 hover:bg-zinc-50"
          }`}
        >
          {t === "orders" ? "Live Orders" : "Menu Items"}
          {t === "orders" && pendingCount > 0 && (
            <span className="absolute top-1.5 right-2 w-5 h-5 bg-accent text-white text-xs border border-black rounded-full flex items-center justify-center font-black animate-bounce shadow-[1px_1px_0px_0px_#000]">
              {pendingCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardClient({ cafe: initialCafe, hasMultipleCafes }: { cafe?: any; hasMultipleCafes?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [subTab, setSubTab] = useState<"incoming" | "cooking" | "completed">("incoming");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [cafeDetails, setCafeDetails] = useState<{
    id: string;
    business_name: string;
    has_seating: boolean;
    table_count: number | null;
  } | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("0");
  const [qrPrintMode, setQrPrintMode] = useState<"single" | "all">("single");
  const [printMode, setPrintMode] = useState<"kot" | "bill" | null>(null);
  const [origin, setOrigin] = useState(() => {
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    return "";
  });
  const [isQrExpanded, setIsQrExpanded] = useState(false);

  // Modal states for adding menu items
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("General");
  const [addError, setAddError] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  // Category management & Edit modal states
  const [categories, setCategories] = useState<{ id: string; name: string; sort_order: number }[]>([]);
  const [isManageCatOpen, setIsManageCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [newItemCategoryId, setNewItemCategoryId] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemCategoryId, setEditItemCategoryId] = useState("");
  const [updatingItem, setUpdatingItem] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [showScheduled, setShowScheduled] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Stable client ref — avoids re-creating on every render
  const [supabase] = useState(() => createClient());

  // Load Razorpay script dynamically on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  // Counter Order Modal states
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterCart, setCounterCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [counterSearchQuery, setCounterSearchQuery] = useState("");
  const [counterFulfillment, setCounterFulfillment] = useState<"counter" | "room_delivery">("counter");
  const [counterHostelBlock, setCounterHostelBlock] = useState("");
  const [counterRoomNumber, setCounterRoomNumber] = useState("");
  const [counterPaymentMethod, setCounterPaymentMethod] = useState<"cash" | "razorpay">("cash");
  const [counterSubmitting, setCounterSubmitting] = useState(false);
  const [counterError, setCounterError] = useState<string | null>(null);

  // Razorpay states for counter modal (mock simulator)
  const [showCounterMockPayment, setShowCounterMockPayment] = useState(false);
  const [counterMockPaymentData, setCounterMockPaymentData] = useState<any | null>(null);
  const [counterMockOrderData, setCounterMockOrderData] = useState<any | null>(null);

  const closeCounterModal = () => {
    setIsCounterModalOpen(false);
    setCounterCart([]);
    setCounterSearchQuery("");
    setCounterFulfillment("counter");
    setCounterHostelBlock("");
    setCounterRoomNumber("");
    setCounterPaymentMethod("cash");
    setCounterSubmitting(false);
    setCounterError(null);
    setShowCounterMockPayment(false);
    setCounterMockPaymentData(null);
    setCounterMockOrderData(null);
  };

  const addToCounterCart = (item: MenuItem) => {
    setCounterCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCounterCart = (itemId: string) => {
    setCounterCart((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleConfirmAndCook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (counterCart.length === 0 || !cafeId) return;
    setCounterSubmitting(true);
    setCounterError(null);

    const totalAmount = counterCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      if (counterPaymentMethod === "cash") {
        // Direct cash/UPI payment: instant confirmation, status: 'preparing', payment_status: 'paid'
        const { data: newOrder, error: insertError } = await supabase
          .from("orders")
          .insert({
            cafe_id: cafeId,
            table_number: "0",
            total_amount: totalAmount,
            cart_items: counterCart,
            order_status: "preparing",
            payment_status: "paid",
            fulfillment_type: counterFulfillment,
            hostel_block: counterFulfillment === "room_delivery" ? counterHostelBlock.trim() : null,
            room_number: counterFulfillment === "room_delivery" ? counterRoomNumber.trim() : null,
            discount_amount: 0,
            coupon_id: null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (!newOrder) throw new Error("Failed to create order");

        if (soundEnabledRef.current) {
          play();
        }

        setOrders((prev) => {
          if (prev.some((o) => o.id === newOrder.id)) return prev;
          return [newOrder as Order, ...prev];
        });
        triggerReceiptPrint(newOrder);

        closeCounterModal();
      } else {
        // Razorpay payment flow:
        const { data: newOrder, error: insertError } = await supabase
          .from("orders")
          .insert({
            cafe_id: cafeId,
            table_number: "0",
            total_amount: totalAmount,
            cart_items: counterCart,
            order_status: "pending",
            payment_status: "unpaid",
            fulfillment_type: counterFulfillment,
            hostel_block: counterFulfillment === "room_delivery" ? counterHostelBlock.trim() : null,
            room_number: counterFulfillment === "room_delivery" ? counterRoomNumber.trim() : null,
            discount_amount: 0,
            coupon_id: null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (!newOrder) throw new Error("Failed to create order");

        const response = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totalAmount,
            orderId: newOrder.id,
            cafeId: cafeId,
          }),
        });

        const res = await response.json();
        if (!response.ok || !res.success) {
          throw new Error(res?.error || "Failed to initialize Razorpay payment. Please try again.");
        }

        if (res.keyId === "rzp_test_mock") {
          setCounterMockPaymentData(res);
          setCounterMockOrderData(newOrder);
          setShowCounterMockPayment(true);
          setCounterSubmitting(false);
          return;
        }

        const options = {
          key: res.keyId,
          amount: res.amount,
          currency: res.currency,
          name: cafeDetails?.business_name || "QuickOrder",
          description: `Counter Order #${newOrder.id.slice(0, 8)}`,
          order_id: res.orderId,
          handler: async function (response: any) {
            setCounterSubmitting(true);
            try {
              const verifyResponse = await fetch("/api/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: newOrder.id,
                  cafeId: cafeId,
                }),
              });
              const verifyResult = await verifyResponse.json();
              if (verifyResult.success) {
                const updatedOrder = { ...newOrder, order_status: "preparing" as any, payment_status: "paid" };
                setOrders((prev) => {
                  const exists = prev.some((o) => o.id === updatedOrder.id);
                  if (exists) {
                    return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
                  }
                  return [updatedOrder, ...prev];
                });
                triggerReceiptPrint(updatedOrder);
                closeCounterModal();
              } else {
                throw new Error(verifyResult.error || "Signature verification failed");
              }
            } catch (err: any) {
              setCounterError(err.message || "Failed to verify payment signature.");
            } finally {
              setCounterSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setCounterSubmitting(false);
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
      }
    } catch (err: any) {
      setCounterError(err.message || "Something went wrong.");
      setCounterSubmitting(false);
    }
  };

  const handleCounterMockPaymentSuccess = async () => {
    if (!counterMockPaymentData || !counterMockOrderData) return;
    setShowCounterMockPayment(false);
    setCounterSubmitting(true);
    try {
      const verifyResponse = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: counterMockPaymentData.orderId,
          razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(2, 11),
          razorpay_signature: "mock_signature_valid",
          orderId: counterMockOrderData.id,
          cafeId: cafeId,
        }),
      });
      const verifyResult = await verifyResponse.json();
      if (verifyResult.success) {
        const updatedOrder = { ...counterMockOrderData, order_status: "preparing" as any, payment_status: "paid" };
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === updatedOrder.id);
          if (exists) {
            return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
          }
          return [updatedOrder, ...prev];
        });
        triggerReceiptPrint(updatedOrder);
        closeCounterModal();
      } else {
        throw new Error(verifyResult.error || "Verification failed");
      }
    } catch (err: any) {
      setCounterError(err.message || "Failed to verify mock payment");
    } finally {
      setCounterSubmitting(false);
    }
  };

  const { unlocked, unlock, play } = useAudioAlert("/bell.mp3");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    if (nextVal && !unlocked) {
      unlock();
    }
  };



  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(prev => prev || window.location.origin.replace(/\/$/, ""));
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

  const handleAddMenuItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice.trim()) return;
    setAddingItem(true);
    setAddError(null);

    try {
      const priceVal = parseFloat(newItemPrice);
      if (isNaN(priceVal) || priceVal <= 0) {
        throw new Error("Price must be a positive number");
      }

      const selectedCatName = categories.find((c) => c.id === newItemCategoryId)?.name || "General";

      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          cafe_id: cafeId,
          name: newItemName.trim(),
          price: priceVal,
          category: selectedCatName,
          category_id: newItemCategoryId || null,
          is_available: true,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMenuItems((prev) => [...prev, data as MenuItem].sort((a, b) => a.name.localeCompare(b.name)));
        setIsAddModalOpen(false);
        setNewItemName("");
        setNewItemPrice("");
        setNewItemCategoryId("");
      }
    } catch (err: any) {
      setAddError(err.message || "Failed to add menu item");
    } finally {
      setAddingItem(false);
    }
  };

  const handleCreateCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !cafeId) return;
    setCreatingCat(true);
    try {
      const nextSortOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.sort_order ?? 0)) + 1
        : 0;

      const { data: category, error: insertError } = await supabase
        .from("menu_categories")
        .insert({
          cafe_id: cafeId,
          name: newCatName.trim(),
          sort_order: nextSortOrder,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (category) {
        setCategories((prev) => [...prev, category].sort((a, b) => a.sort_order - b.sort_order));
        setNewCatName("");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create category");
    } finally {
      setCreatingCat(false);
    }
  };

  const handleDeleteCatSubmit = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? Items in this category will become Uncategorized.")) return;
    try {
      const { error: deleteError } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", categoryId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      // Also update local menuItems state
      setMenuItems((prev) =>
        prev.map((item) => (item.category_id === categoryId ? { ...item, category_id: null, category: "General" } : item))
      );
    } catch (err: any) {
      alert(err.message || "Failed to delete category");
    }
  };

  const handleEditClick = (item: MenuItem) => {
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditItemPrice(String(item.price));
    setEditItemCategoryId(item.category_id || "");
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditMenuItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemName.trim() || !editItemPrice.trim()) return;
    setUpdatingItem(true);
    setEditError(null);

    try {
      const priceVal = parseFloat(editItemPrice);
      if (isNaN(priceVal) || priceVal <= 0) {
        throw new Error("Price must be a positive number");
      }

      const selectedCatName = categories.find((c) => c.id === editItemCategoryId)?.name || "General";

      const { data, error } = await supabase
        .from("menu_items")
        .update({
          name: editItemName.trim(),
          price: priceVal,
          category: selectedCatName,
          category_id: editItemCategoryId || null,
        })
        .eq("id", editItemId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMenuItems((prev) =>
          prev
            .map((item) => (item.id === editItemId ? (data as MenuItem) : item))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      setEditError(err.message || "Failed to update menu item");
    } finally {
      setUpdatingItem(false);
    }
  };

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const authResponse = await supabase.auth.getUser();
      let user = authResponse.data.user;
      if (!user && process.env.NODE_ENV === "development") {
        user = { id: "1323e9a6-4069-4f40-bced-115cb1d1d745", email: "owner@example.com" } as any;
      }
      if (!user) {
        router.push("/login");
        return;
      }

      let cafe = initialCafe;
      if (!cafe) {
        const { data } = await supabase
          .from("cafes")
          .select("id, business_name, has_seating, table_count")
          .eq("id", user.id)
          .single();
        cafe = data;
      }

      if (!cafe) {
        router.push("/setup");
        return;
      }

      const currentCafeId = cafe.id;
      setCafeId(currentCafeId);
      setCafeDetails(cafe);

      setLoadingMenu(true);
      const { data: items } = await supabase
        .from("menu_items").select("*").eq("cafe_id", currentCafeId).order("name");
      if (items) setMenuItems(items);

      const { data: catData } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("cafe_id", currentCafeId)
        .order("sort_order", { ascending: true });
      if (catData) setCategories(catData);
      setLoadingMenu(false);

      const { data: ordersData } = await supabase
        .from("orders").select("*").eq("cafe_id", currentCafeId)
        .order("created_at", { ascending: false }).limit(30);
      if (ordersData) setOrders(ordersData as Order[]);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Supabase Realtime subscription ─────────────────────────────────────────
  useEffect(() => {
    if (!cafeId) return;

    const channel = supabase
      .channel(`orders:cafe_id=eq.${cafeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `cafe_id=eq.${cafeId}`,
        },
        (payload) => {
          const newOrder = payload.new as Order;
          // Prepend to top so it appears first in the list, avoiding duplicates
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
          // 🔔 Play the bell
          if (soundEnabledRef.current) {
            play();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `cafe_id=eq.${cafeId}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o))
          );
        }
      )
      .subscribe();

    // Cleanup: unsubscribe when cafeId changes or component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cafeId, supabase, play]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleToggleItem(id: string, value: boolean) {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_available: value } : item))
    );
    if (cafeId) {
      await supabase.from("menu_items")
        .update({ is_available: value }).eq("id", id).eq("cafe_id", cafeId);
    }
  }

  const triggerReceiptPrint = useCallback((order: Order) => {
    setPrintingOrder(order);
    setPrintMode("kot");
    setTimeout(() => {
      window.print();
      setPrintMode("bill");
      setTimeout(() => {
        window.print();
        setPrintMode(null);
      }, 300);
    }, 150);
  }, []);

  const handleAcceptAndCook = useCallback(async (order: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, order_status: "preparing" } : o))
    );
    await supabase.from("orders").update({ order_status: "preparing" }).eq("id", order.id);
    triggerReceiptPrint(order);
  }, [supabase, triggerReceiptPrint]);

  const handleStatusChange = useCallback(async (id: string, status: Order["order_status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, order_status: status } : o))
    );
    await supabase.from("orders").update({ order_status: status }).eq("id", id);
  }, [supabase]);

  // ── Derived state ────────────────────────────────────────────────────────────
  // Split pending orders:
  // - rawScheduled: pending orders scheduled > 15m in the future.
  // - rawIncoming: standard pending orders, or scheduled orders <= 15m away / already passed.
  const rawScheduled = orders.filter((o) => 
    o.order_status === "pending" && 
    o.scheduled_at && 
    (new Date(o.scheduled_at).getTime() - currentTime) > 15 * 60 * 1000
  );

  const rawIncoming = orders.filter((o) => 
    o.order_status === "pending" && 
    (!o.scheduled_at || (new Date(o.scheduled_at).getTime() - currentTime) <= 15 * 60 * 1000)
  );

  const rawCooking = orders.filter((o) => o.order_status === "preparing");
  const rawDone = orders.filter((o) => o.order_status === "done");

  const sortOrders = (ordersList: Order[], criteria: SortOption, column: "incoming" | "cooking" | "completed") => {
    return [...ordersList].sort((a, b) => {
      let activeCriteria = criteria;
      
      if (criteria === "default") {
        if (column === "incoming" || column === "cooking") {
          activeCriteria = "oldest";
        } else {
          activeCriteria = "newest";
        }
      }

      if (activeCriteria === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (activeCriteria === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (activeCriteria === "price-desc") {
        return b.total_amount - a.total_amount;
      }
      if (activeCriteria === "price-asc") {
        return a.total_amount - b.total_amount;
      }
      return 0;
    });
  };

  const incomingOrders = sortOrders(rawIncoming, sortBy, "incoming");
  const cookingOrders = sortOrders(rawCooking, sortBy, "cooking");
  const doneOrders = sortOrders(rawDone, sortBy, "completed");

  const scheduledOrders = [...rawScheduled].sort((a, b) => {
    if (!a.scheduled_at || !b.scheduled_at) return 0;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  if (!cafeId) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-black border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-dvh flex flex-col bg-background w-full max-w-7xl xl:max-w-[1440px] mx-auto text-black print:hidden">

      {/* ── Header ── */}
      <header className="no-print sticky top-0 z-10 bg-white border-b-2 border-black">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_#ff6b35] shrink-0">
              <span className="text-white text-sm font-black">Q</span>
            </div>
            <div>
              <p className="font-display font-black text-black text-sm leading-tight uppercase tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
                {cafeDetails?.business_name || "Dashboard"}
              </p>
              <p className="text-black/60 text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap">
                {incomingOrders.length > 0
                  ? `${incomingOrders.length} order${incomingOrders.length > 1 ? "s" : ""} waiting`
                  : unlocked && soundEnabled ? "Listening for orders 👂" : "All caught up 👍"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap gap-y-2 justify-end">
            <button
              onClick={() => setIsCounterModalOpen(true)}
              className="bg-[#ff90e8] text-black border-4 border-black font-black uppercase p-3 shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer text-xs rounded-none"
            >
              New Counter Order (+)
            </button>
            {incomingOrders.length > 0 && (
              <div className="w-2.5 h-2.5 bg-warning border border-black rounded-full animate-ping" />
            )}
            {soundEnabled && unlocked && (
              <div className="w-2 h-2 bg-success border border-black rounded-full" title="Alerts active" />
            )}
            <button
              onClick={handleToggleSound}
              className={`font-black text-xs border-2 border-black px-2 py-1.5 sm:px-3 shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-all rounded-none flex items-center justify-center min-h-[36px] ${
                soundEnabled ? "bg-warning text-black" : "bg-zinc-100 text-black/60"
              }`}
            >
              {soundEnabled ? (
                <>🔔 <span className="hidden sm:inline">Sound: </span>ON</>
              ) : (
                <>🔕 <span className="hidden sm:inline">Sound: </span>OFF</>
              )}
            </button>

            {hasMultipleCafes && (
              <button
                onClick={() => router.push("/dashboard")}
                className="text-black font-black text-xs border-2 border-black bg-zinc-100 px-2 py-1.5 sm:px-3 shadow-[2px_2px_0px_0px_#000] cursor-pointer hover:bg-zinc-200 transition-all flex items-center justify-center gap-1 rounded-none min-h-[36px]"
              >
                <span>🏢</span>
                <span className="hidden sm:inline">Master Panel</span>
              </button>
            )}
            <button
              onClick={() => router.push(cafeId ? `/dashboard/settings?cafeId=${cafeId}` : "/dashboard/settings")}
              className="text-black font-black text-xs border-2 border-black bg-white px-2 py-1.5 sm:px-3 shadow-[2px_2px_0px_0px_#000] cursor-pointer hover:bg-zinc-50 transition-all flex items-center justify-center gap-1 rounded-none min-h-[36px]"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats strip / Mobile column switcher ── */}
      <div className="no-print flex gap-3 px-4 md:px-6 py-3 lg:hidden">
        <button
          onClick={() => setSubTab("incoming")}
          className={`flex-1 border-2 border-black rounded-none p-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-left transition-all ${
            subTab === "incoming"
              ? "bg-warning text-black font-black"
              : "bg-white text-black hover:bg-zinc-50"
          }`}
        >
          <p className={`text-[10px] uppercase font-bold tracking-wider ${subTab === "incoming" ? "text-black" : "text-black/60"}`}>Incoming</p>
          <p className="font-display font-black text-xl mt-0.5">{incomingOrders.length}</p>
        </button>
        <button
          onClick={() => setSubTab("cooking")}
          className={`flex-1 border-2 border-black rounded-none p-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-left transition-all ${
            subTab === "cooking"
              ? "bg-blue-500 text-black font-black"
              : "bg-white text-black hover:bg-zinc-50"
          }`}
        >
          <p className={`text-[10px] uppercase font-bold tracking-wider ${subTab === "cooking" ? "text-black" : "text-black/60"}`}>Cooking</p>
          <p className="font-display font-black text-xl mt-0.5">{cookingOrders.length}</p>
        </button>
        <button
          onClick={() => setSubTab("completed")}
          className={`flex-1 border-2 border-black rounded-none p-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-left transition-all ${
            subTab === "completed"
              ? "bg-green-800 text-white font-black"
              : "bg-white text-black hover:bg-zinc-50"
          }`}
        >
          <p className={`text-[10px] uppercase font-bold tracking-wider ${subTab === "completed" ? "text-white" : "text-black/60"}`}>Completed</p>
          <p className={`font-display font-black text-xl mt-0.5 ${subTab === "completed" ? "text-white" : "text-black"}`}>{doneOrders.length}</p>
        </button>
      </div>

      {/* ── Tabs ── */}
      <TabBar active={tab} onChange={setTab} pendingCount={incomingOrders.length} />

      {/* ── Content ── */}
      <main className="no-print flex-1 overflow-y-auto pb-6 px-4 md:px-6">
        {tab === "orders" && (
          <>
            {/* Sort Controls */}
            <div className="flex justify-between items-center mb-4 px-1">
              <p className="text-black/60 text-xs font-bold uppercase tracking-wider">
                {orders.length} active orders
              </p>
              <div className="flex items-center gap-2">
                <span className="text-black/65 text-xs font-black uppercase">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-white border-2 border-black font-display font-black text-xs px-2 py-1 shadow-[2px_2px_0px_0px_#000] focus:outline-none cursor-pointer rounded-none"
                >
                  <option value="default">Default (Smart) ⚡</option>
                  <option value="newest">Newest First ⏰</option>
                  <option value="oldest">Oldest First ⏳</option>
                  <option value="price-desc">Price: High to Low 📈</option>
                  <option value="price-asc">Price: Low to High 📉</option>
                </select>
              </div>
            </div>

            {scheduledOrders.length > 0 && (
              <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black mb-6">
                <button
                  onClick={() => setShowScheduled(!showScheduled)}
                  className="w-full flex items-center justify-between font-display font-black text-sm uppercase tracking-widest text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    📅 Scheduled Orders ({scheduledOrders.length})
                  </span>
                  <span className="text-xs border-2 border-black bg-white px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black select-none">
                    {showScheduled ? "COLLAPSE ▲" : "EXPAND ▼"}
                  </span>
                </button>
                {showScheduled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 pt-4 border-t-4 border-black border-dashed">
                    {scheduledOrders.map((order) => (
                      <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} onAcceptAndCook={handleAcceptAndCook} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

              {/* Column 1: Incoming */}
              <div className={`space-y-4 ${subTab === "incoming" ? "block" : "hidden lg:block"}`}>
                <div className="flex justify-between items-center mb-4 px-1 pb-2 border-b-4 border-black">
                  <p className="text-black font-black text-sm uppercase tracking-widest">🔔 Incoming</p>
                  <span className="text-white bg-black font-display font-black text-base px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {incomingOrders.length}
                  </span>
                </div>
                {incomingOrders.length > 0 ? (
                  <div className="space-y-4">
                    {incomingOrders.map((order) => (
                      <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} onAcceptAndCook={handleAcceptAndCook} />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-4 border-black bg-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-4xl">😴</span>
                    <p className="text-black font-black uppercase tracking-tight mt-3 text-xs">No pending orders</p>
                  </div>
                )}
              </div>

              {/* Column 2: Cooking */}
              <div className={`space-y-4 ${subTab === "cooking" ? "block" : "hidden lg:block"}`}>
                <div className="flex justify-between items-center mb-4 px-1 pb-2 border-b-4 border-black">
                  <p className="text-black font-black text-sm uppercase tracking-widest">🍳 Cooking</p>
                  <span className="text-white bg-black font-display font-black text-base px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {cookingOrders.length}
                  </span>
                </div>
                {cookingOrders.length > 0 ? (
                  <div className="space-y-4">
                    {cookingOrders.map((order) => (
                      <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-4 border-black bg-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-4xl">🍳</span>
                    <p className="text-black font-black uppercase tracking-tight mt-3 text-xs">Nothing cooking</p>
                  </div>
                )}
              </div>

              {/* Column 3: Completed */}
              <div className={`space-y-4 ${subTab === "completed" ? "block" : "hidden lg:block"}`}>
                <div className="flex justify-between items-center mb-4 px-1 pb-2 border-b-4 border-black">
                  <p className="text-black/65 font-black text-sm uppercase tracking-widest">Completed</p>
                  <span className="text-white bg-black font-display font-black text-base px-2.5 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {doneOrders.length}
                  </span>
                </div>
                {doneOrders.length > 0 ? (
                  <div className="space-y-4">
                    {doneOrders.slice(0, 8).map((order) => (
                      <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-4 border-black bg-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-4xl">💤</span>
                    <p className="text-black/60 font-black uppercase tracking-tight mt-3 text-xs">No orders completed</p>
                  </div>
                )}
              </div>

            </div>
          </>
        )}
        {tab === "menu" && (
          <div className="text-black">
            {loadingMenu && (
              <div className="py-8 flex justify-center">
                <span className="w-6 h-6 border-2 border-black border-t-accent rounded-full animate-spin" />
              </div>
            )}

            {/* Manage Categories Banner */}
            <div className="mb-6 p-4 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] rounded-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-black text-sm uppercase tracking-tight flex items-center gap-1.5 text-black">
                    📂 Menu Categories
                  </h3>
                  <p className="text-black/60 text-xs font-bold leading-normal mt-0.5">
                    Organize your menu items. Customers will see them grouped by category on their screens.
                  </p>
                </div>
                <button
                  onClick={() => setIsManageCatOpen(true)}
                  className="px-3 py-1.5 bg-warning text-black border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer w-fit shrink-0 rounded-none"
                >
                  Manage Categories
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {categories.map((category) => {
                const categoryItems = menuItems.filter((item) => item.category_id === category.id);
                if (categoryItems.length === 0) return null;
                return (
                  <div key={category.id} className="space-y-3">
                    <h3 className="font-display font-black text-sm uppercase tracking-tight text-black border-b-2 border-black pb-1">
                      {category.name} ({categoryItems.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {categoryItems.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_#000] overflow-hidden">
                          <MenuItemRow item={item} onToggle={handleToggleItem} onEdit={handleEditClick} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Uncategorized Items */}
              {(() => {
                const uncategorizedItems = menuItems.filter(
                  (item) => !item.category_id || !categories.some((c) => c.id === item.category_id)
                );
                if (uncategorizedItems.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <h3 className="font-display font-black text-sm uppercase tracking-tight text-black border-b-2 border-black pb-1">
                      Other Items ({uncategorizedItems.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {uncategorizedItems.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_#000] overflow-hidden">
                          <MenuItemRow item={item} onToggle={handleToggleItem} onEdit={handleEditClick} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <p className="text-black/60 text-xs font-bold uppercase tracking-wider text-center mt-8">
              {menuItems.filter((i) => i.is_available).length} of {menuItems.length} items live
            </p>

            {/* FAB */}
            <div className="fixed bottom-6 right-6 pointer-events-none w-full flex justify-end xl:max-w-7xl max-w-md mx-auto px-4 xl:px-0"
              style={{ left: "50%", transform: "translateX(-50%)" }}>
              <div className="pointer-events-auto">
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-14 h-14 bg-accent text-white border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center text-3xl font-black hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer rounded-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Menu Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] rounded-none animate-in fade-in zoom-in-95 duration-200 text-black">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
              <h3 className="text-black font-display font-black text-lg uppercase tracking-tight">Add Menu Item</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-black/60 hover:text-black font-black text-base cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {addError && (
              <div className="mb-4 p-2.5 border-2 border-black bg-danger/10 text-danger text-xs font-bold">
                ⚠️ {addError}
              </div>
            )}

            <form onSubmit={handleAddMenuItemSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">Item Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Cold Coffee"
                  className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm placeholder:text-gray-400"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm placeholder:text-gray-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">Category</label>
                  <select
                    value={newItemCategoryId}
                    onChange={(e) => setNewItemCategoryId(e.target.value)}
                    className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 min-h-11 bg-white border-2 border-black text-black font-bold text-sm shadow-[2px_2px_0px_0px_#000] hover:bg-zinc-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingItem}
                  className="flex-1 min-h-11 bg-success text-white border-2 border-black font-display font-black uppercase tracking-tight text-sm shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer rounded-none"
                >
                  {addingItem ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Add Item"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Menu Item Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] rounded-none animate-in fade-in zoom-in-95 duration-200 text-black">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
              <h3 className="text-black font-display font-black text-lg uppercase tracking-tight">Edit Menu Item</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-black/60 hover:text-black font-black text-base cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {editError && (
              <div className="mb-4 p-2.5 border-2 border-black bg-danger/10 text-danger text-xs font-bold">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditMenuItemSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">Item Name</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  placeholder="e.g. Cold Coffee"
                  className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={editItemPrice}
                    onChange={(e) => setEditItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">Category</label>
                  <select
                    value={editItemCategoryId}
                    onChange={(e) => setEditItemCategoryId(e.target.value)}
                    className="w-full min-h-11 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 min-h-11 bg-white border-2 border-black text-black font-bold text-sm shadow-[2px_2px_0px_0px_#000] hover:bg-zinc-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer rounded-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingItem}
                  className="flex-1 min-h-11 bg-success text-white border-2 border-black font-display font-black uppercase tracking-tight text-sm shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer rounded-none"
                >
                  {updatingItem ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {isManageCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border-3 border-black p-6 shadow-[6px_6px_0px_0px_#000] rounded-none animate-in fade-in zoom-in-95 duration-200 text-black">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
              <h3 className="text-black font-display font-black text-lg uppercase tracking-tight">Manage Categories</h3>
              <button 
                onClick={() => setIsManageCatOpen(false)}
                className="text-black/60 hover:text-black font-black text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List existing categories */}
            <div className="max-h-60 overflow-y-auto mb-4 space-y-2 pr-1">
              {categories.length === 0 ? (
                <p className="text-black/60 text-xs font-bold uppercase text-center py-4">No categories created yet</p>
              ) : (
                categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 border-2 border-black bg-zinc-50">
                    <span className="text-sm font-bold uppercase">{c.name}</span>
                    <button
                      onClick={() => handleDeleteCatSubmit(c.id)}
                      className="text-danger hover:text-danger/80 font-black text-xs border border-black bg-white px-2 py-0.5 shadow-[1px_1px_0px_0px_#000] hover:translate-x-[0.5px] hover:translate-y-[0.5px] cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new category form */}
            <form onSubmit={handleCreateCatSubmit} className="space-y-3 pt-2 border-t-2 border-dashed border-black/25">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">New Category Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Desserts"
                    className="flex-1 min-h-10 px-3 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={creatingCat}
                    className="px-4 min-h-10 bg-success text-white border-2 border-black font-display font-black uppercase tracking-tight text-xs shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer rounded-none"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Printable QRs Sheet ── */}
      {cafeId && (
        <div id="print-area" className="hidden">
          <div className="flex flex-col items-center justify-center p-8 bg-white min-h-[600px]">
            <div className="border-4 border-black bg-[#f5f2eb] p-8 flex flex-col items-center justify-center text-center w-[250px] h-[360px] shadow-[6px_6px_0px_0px_#000]">
              <h2 className="font-display font-black text-xl uppercase tracking-tight text-black mb-1">{cafeDetails?.business_name}</h2>
              <div className="my-5 p-3 bg-white border-2 border-black">
                <QRCode value={`${origin || "https://quickorder.pages.dev"}/${cafeId}`} size={140} level="H" />
              </div>
              <p className="font-display font-black text-base uppercase tracking-wider text-black bg-warning border-2 border-black px-4 py-1.5 shadow-[3px_3px_0px_0px_#000]">
                MENU QR CODE
              </p>
              <p className="text-[10px] font-black uppercase text-black/60 tracking-widest mt-4">SCAN TO ORDER</p>
            </div>
          </div>
        </div>
      )}

      {/* Counter Order Modal */}
      {isCounterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
          <div className="w-full max-w-5xl bg-[#f5f2eb] border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000] rounded-none animate-in fade-in zoom-in-95 duration-200 text-black max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b-4 border-black mb-4">
              <div>
                <h2 className="font-display font-black text-xl uppercase tracking-tight">Counter Order Panel</h2>
                <p className="text-[10px] font-black uppercase text-black/60 tracking-wider">Take walk-in and room delivery orders directly</p>
              </div>
              <button 
                onClick={closeCounterModal}
                className="text-black hover:text-black/60 font-black text-2xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {counterError && (
              <div className="mb-4 p-3 border-2 border-black bg-danger/10 text-danger text-sm font-bold">
                ⚠️ {counterError}
              </div>
            )}

            {/* 2-Column Content */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
              
              {/* Left Column (Grid of Menu Items) - 7 cols */}
              <div className="md:col-span-7 flex flex-col min-h-0">
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={counterSearchQuery}
                    onChange={(e) => setCounterSearchQuery(e.target.value)}
                    placeholder="Search menu items..."
                    className="w-full min-h-12 px-4 border-2 border-black bg-white text-black font-bold focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0px_0px_#000] text-sm placeholder:text-gray-400"
                  />
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  {loadingMenu ? (
                    <div className="py-8 flex justify-center">
                      <span className="w-6 h-6 border-2 border-black border-t-accent rounded-full animate-spin" />
                    </div>
                  ) : (
                    (() => {
                      const filtered = menuItems.filter(
                        (item) =>
                          item.is_available &&
                          item.name.toLowerCase().includes(counterSearchQuery.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center border-2 border-black bg-white rounded-none shadow-[2px_2px_0px_0px_#000]">
                            <span className="text-2xl">🔍</span>
                            <p className="text-black/60 font-bold uppercase text-xs mt-2">No active items found</p>
                          </div>
                        );
                      }

                      // Group by categories matching tab="menu" structure
                      return (
                        <div className="space-y-4">
                          {categories.map((category) => {
                            const categoryItems = filtered.filter((item) => item.category_id === category.id);
                            if (categoryItems.length === 0) return null;
                            return (
                              <div key={category.id} className="space-y-2">
                                <h4 className="font-display font-black text-xs uppercase tracking-wider text-black border-b border-black/30 pb-0.5">
                                  {category.name} ({categoryItems.length})
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {categoryItems.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => addToCounterCart(item)}
                                      className="flex items-center justify-between p-3 border-2 border-black bg-white text-left hover:bg-warning/10 active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_0px_#000] active:shadow-none transition-all cursor-pointer"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-xs uppercase tracking-tight truncate text-black">{item.name}</p>
                                        <p className="text-accent font-black text-xs mt-0.5">₹{item.price}</p>
                                      </div>
                                      <span className="text-lg text-black font-black font-sans shrink-0 bg-zinc-100 hover:bg-warning border border-black w-6 h-6 flex items-center justify-center">+</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}

                          {/* Uncategorized Items */}
                          {(() => {
                            const uncategorizedItems = filtered.filter(
                              (item) => !item.category_id || !categories.some((c) => c.id === item.category_id)
                            );
                            if (uncategorizedItems.length === 0) return null;
                            return (
                              <div className="space-y-2">
                                <h4 className="font-display font-black text-xs uppercase tracking-wider text-black border-b border-black/30 pb-0.5">
                                  Other Items ({uncategorizedItems.length})
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {uncategorizedItems.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => addToCounterCart(item)}
                                      className="flex items-center justify-between p-3 border-2 border-black bg-white text-left hover:bg-warning/10 active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_0px_#000] active:shadow-none transition-all cursor-pointer"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <p className="font-bold text-xs uppercase tracking-tight truncate text-black">{item.name}</p>
                                        <p className="text-accent font-black text-xs mt-0.5">₹{item.price}</p>
                                      </div>
                                      <span className="text-lg text-black font-black font-sans shrink-0 bg-zinc-100 hover:bg-warning border border-black w-6 h-6 flex items-center justify-center">+</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Right Column (Cart & Submission) - 5 cols */}
              <div className="md:col-span-5 flex flex-col bg-white border-2 border-black p-3.5 shadow-[4px_4px_0px_0px_#000] overflow-hidden max-h-full">
                <h3 className="font-display font-black text-sm uppercase tracking-tight border-b-2 border-black pb-1 mb-2 flex justify-between items-center shrink-0">
                  <span>🛒 Cart Summary</span>
                  {counterCart.length > 0 && (
                    <button 
                      onClick={() => setCounterCart([])}
                      className="text-xs text-danger font-bold hover:underline uppercase"
                    >
                      Clear All
                    </button>
                  )}
                </h3>

                {/* Cart Items list */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-0 mb-2">
                  {counterCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-black/40 py-8">
                      <span className="text-2xl mb-1">🍽️</span>
                      <p className="text-xs font-bold uppercase tracking-wider">Cart is empty</p>
                      <p className="text-[10px] mt-0.5">Add items from the menu grid</p>
                    </div>
                  ) : (
                    counterCart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-zinc-200">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-xs uppercase tracking-tight truncate">{item.name}</p>
                          <p className="text-[9px] text-black/60 font-semibold mt-0.5">₹{item.price} each</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border border-black overflow-hidden bg-white">
                            <button
                              onClick={() => removeFromCounterCart(item.id)}
                              className="px-1.5 py-0.5 bg-zinc-50 hover:bg-zinc-150 text-xs font-bold border-r border-black"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-black min-w-[20px] text-center bg-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => addToCounterCart(item as any)}
                              className="px-1.5 py-0.5 bg-zinc-50 hover:bg-zinc-150 text-xs font-bold border-l border-black"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs font-bold font-mono min-w-[45px] text-right">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal & Total */}
                <div className="border-t-2 border-black pt-2 mt-1 space-y-1 shrink-0">
                  <div className="flex justify-between items-center font-display font-black text-sm uppercase tracking-tight">
                    <span>Total Amount:</span>
                    <span className="text-accent text-base">₹{counterCart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Fulfillment Option */}
                <div className="mt-2.5 border-t border-dashed border-black/30 pt-2.5 shrink-0">
                  <label className="block text-[9px] font-black uppercase text-gray-500 tracking-wider mb-1">Fulfillment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCounterFulfillment("counter")}
                      className={`py-1.5 text-xs font-black uppercase border-2 border-black tracking-wider transition-all cursor-pointer rounded-none ${
                        counterFulfillment === "counter"
                          ? "bg-warning text-black shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                          : "bg-white text-black hover:bg-zinc-50"
                      }`}
                    >
                      🏃 Counter Pick Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounterFulfillment("room_delivery")}
                      className={`py-1.5 text-xs font-black uppercase border-2 border-black tracking-wider transition-all cursor-pointer rounded-none ${
                        counterFulfillment === "room_delivery"
                          ? "bg-accent text-white shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                          : "bg-white text-black hover:bg-zinc-50"
                      }`}
                    >
                      🚪 Room Delivery
                    </button>
                  </div>

                  {counterFulfillment === "room_delivery" && (
                    <div className="grid grid-cols-2 gap-3 mt-2 p-2 bg-zinc-50 border-2 border-black shrink-0">
                      <div>
                        <label className="block text-[9px] font-black uppercase text-black mb-1">Hostel Block</label>
                        <input
                          type="text"
                          required
                          value={counterHostelBlock}
                          onChange={(e) => setCounterHostelBlock(e.target.value)}
                          placeholder="e.g. A"
                          className="w-full min-h-8 px-2 border border-black bg-white text-black font-bold focus:outline-none text-xs rounded-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-black mb-1">Room Number</label>
                        <input
                          type="text"
                          required
                          value={counterRoomNumber}
                          onChange={(e) => setCounterRoomNumber(e.target.value)}
                          placeholder="e.g. 104"
                          className="w-full min-h-8 px-2 border border-black bg-white text-black font-bold focus:outline-none text-xs rounded-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Option */}
                <div className="mt-2.5 border-t border-dashed border-black/30 pt-2.5 shrink-0">
                  <label className="block text-[9px] font-black uppercase text-gray-500 tracking-wider mb-1">Payment Option</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCounterPaymentMethod("cash")}
                      className={`py-1.5 text-xs font-black uppercase border-2 border-black tracking-wider transition-all cursor-pointer rounded-none ${
                        counterPaymentMethod === "cash"
                          ? "bg-success text-white shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                          : "bg-white text-black hover:bg-zinc-50"
                      }`}
                    >
                      💵 Cash / UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounterPaymentMethod("razorpay")}
                      className={`py-1.5 text-xs font-black uppercase border-2 border-black tracking-wider transition-all cursor-pointer rounded-none ${
                        counterPaymentMethod === "razorpay"
                          ? "bg-success text-white shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                          : "bg-white text-black hover:bg-zinc-50"
                      }`}
                    >
                      💳 Razorpay
                    </button>
                  </div>
                </div>

                {/* Confirm & Cook Button */}
                <button
                  onClick={handleConfirmAndCook}
                  disabled={counterCart.length === 0 || counterSubmitting || (counterFulfillment === "room_delivery" && (!counterHostelBlock.trim() || !counterRoomNumber.trim()))}
                  className="w-full min-h-11 bg-black text-white font-display font-black uppercase text-xs border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer mt-3.5 shrink-0 rounded-none"
                >
                  {counterSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Confirm &amp; Cook 🍳</>
                  )}
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Razorpay Counter Mock Simulator Modal */}
      {showCounterMockPayment && counterMockPaymentData && counterMockOrderData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm no-print">
          <div className="bg-white border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_#000] space-y-5 text-black">
            <div className="border-b-2 border-black pb-2">
              <h3 className="font-display font-black text-lg uppercase tracking-tight">
                💳 Razorpay Simulator
              </h3>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                Developer Test Mode (Counter Panel)
              </p>
            </div>
            
            <div className="space-y-1 text-sm font-bold uppercase tracking-wider">
              <div className="flex justify-between">
                <span className="text-black/55">Order ID:</span>
                <span>#{counterMockOrderData.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55">Amount:</span>
                <span className="text-accent font-black">₹{counterMockOrderData.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCounterMockPaymentSuccess}
                className="w-full min-h-11 bg-success text-white font-display font-black uppercase tracking-tight text-xs shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
              >
                Simulate Payment Success ✅
              </button>
              <button
                onClick={() => {
                  setShowCounterMockPayment(false);
                  setCounterSubmitting(false);
                  setCounterError("Payment simulation cancelled.");
                }}
                className="w-full min-h-11 bg-white border-2 border-black text-black font-bold text-xs shadow-[2px_2px_0px_0px_#000] hover:bg-zinc-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                Simulate Payment Failure ❌
              </button>
            </div>
          </div>
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

      {printingOrder && printMode === "kot" && (
        <div className="hidden print:block">
          <KotTemplate order={printingOrder} />
        </div>
      )}

      {printingOrder && printMode === "bill" && (
        <div className="hidden print:block">
          <CustomerBillTemplate order={printingOrder} cafe={cafeDetails} />
        </div>
      )}
    </>
  );
}

