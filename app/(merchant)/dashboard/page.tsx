"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "react-qr-code";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem, Order } from "@/lib/types";

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
  const unlock = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    // Play at zero volume to unblock the audio context, then immediately pause
    a.volume = 0;
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      a.volume = 1;
      setUnlocked(true);
    }).catch(() => setUnlocked(false));
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
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-50 ${checked ? "bg-green-500 border-green-500" : "bg-white/10 border-white/10"}`}
    >
      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

// ─── Menu Item Row ────────────────────────────────────────────────────────────
function MenuItemRow({ item, onToggle }: {
  item: MenuItem; onToggle: (id: string, val: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  async function handleToggle(val: boolean) {
    setBusy(true); await onToggle(item.id, val); setBusy(false);
  }
  return (
    <div className="flex items-center gap-4 px-4 py-4 min-h-[72px] border-b border-white/5 last:border-0 transition-colors">
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-base leading-tight truncate ${item.is_available ? "text-white" : "text-white/40 line-through"}`}>{item.name}</p>
        <p className="text-orange-400 font-semibold text-sm mt-0.5">₹{item.price}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.is_available ? "bg-green-500/15 text-green-400" : "bg-white/5 text-white/30"}`}>
          {item.is_available ? "Live" : "Off"}
        </span>
        <ToggleSwitch checked={item.is_available} onChange={handleToggle} disabled={busy} />
      </div>
    </div>
  );
}

// ─── Incoming Order Ticket (Yellow) ──────────────────────────────────────────
// Visually distinct from regular order cards — designed to demand attention.
function IncomingTicket({ order, onAccept }: {
  order: Order;
  onAccept: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function handleAccept() {
    setBusy(true);
    await onAccept(order.id);
    setBusy(false);
  }

  return (
    <div className="relative rounded-2xl overflow-hidden animate-[ticket-in_0.35s_ease-out]">
      {/* Pulsing yellow border glow */}
      <div className="absolute inset-0 rounded-2xl ring-2 ring-yellow-400/60 animate-pulse pointer-events-none" />

      {/* Card body */}
      <div className="bg-yellow-400/10 border-2 border-yellow-400/50 rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg">🔔</span>
              <span className="font-bold text-yellow-300 text-lg leading-tight">
                {order.table_number ? `Table ${order.table_number}` : "Takeaway"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                New
              </span>
            </div>
            <p className="text-yellow-400/60 text-xs">Just arrived</p>
          </div>
          <p className="font-bold text-yellow-300 text-2xl shrink-0">₹{order.total_amount}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-yellow-400/20 my-3" />

        {/* Cart items */}
        <div className="space-y-2 mb-4">
          {order.cart_items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-yellow-400/20 text-yellow-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {item.quantity}×
                </span>
                <span className="text-yellow-100 text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-yellow-400/70 text-sm">₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Accept button — large green, impossible to miss */}
        <button
          onClick={handleAccept}
          disabled={busy}
          className="w-full min-h-14 rounded-xl bg-green-500 text-white font-bold text-base shadow-lg shadow-green-500/30 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {busy ? (
            <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Accepting…</>
          ) : (
            <>✅ Accept &amp; Cook</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Regular Order Card (Preparing / Done) ────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  preparing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  done: "bg-green-500/15 text-green-400 border-green-500/20",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "🔔 New", preparing: "🍳 Preparing", done: "✅ Done", cancelled: "✗ Cancelled",
};

function OrderCard({ order, onStatusChange }: {
  order: Order; onStatusChange: (id: string, status: Order["order_status"]) => void;
}) {
  const timeAgo = useCallback(() => {
    const diff = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  }, [order.created_at]);

  const nextStatus: Record<string, Order["order_status"]> = { preparing: "done" };

  return (
    <div className="rounded-2xl border bg-white/3 border-white/8 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">
              {order.table_number ? `Table ${order.table_number}` : "Takeaway"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[order.order_status]}`}>
              {STATUS_LABELS[order.order_status]}
            </span>
          </div>
          <p className="text-white/40 text-xs mt-0.5">{timeAgo()}</p>
        </div>
        <p className="font-bold text-orange-400 text-lg shrink-0">₹{order.total_amount}</p>
      </div>
      <div className="space-y-1 mb-4">
        {order.cart_items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-white/70">{item.name}</span>
            <span className="text-white/40">×{item.quantity}</span>
          </div>
        ))}
      </div>
      {nextStatus[order.order_status] && (
        <button
          onClick={() => onStatusChange(order.id, nextStatus[order.order_status])}
          className="w-full min-h-11 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/20 font-semibold text-sm hover:bg-blue-500/30 active:scale-[0.98] transition-all"
        >
          Mark as Done ✓
        </button>
      )}
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
type Tab = "orders" | "menu";

function TabBar({ active, onChange, pendingCount }: {
  active: Tab; onChange: (t: Tab) => void; pendingCount: number;
}) {
  return (
    <div className="flex bg-white/5 rounded-2xl p-1 mx-4 mb-4">
      {(["orders", "menu"] as Tab[]).map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={`flex-1 min-h-11 rounded-xl text-sm font-semibold transition-all relative ${active === t ? "bg-[#1e1e24] text-white shadow-sm" : "text-white/40 hover:text-white/60"}`}
        >
          {t === "orders" ? "Live Orders" : "Menu Items"}
          {t === "orders" && pendingCount > 0 && (
            <span className="absolute top-1.5 right-2 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
              {pendingCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [cafeId, setCafeId] = useState<string | null>(null);

  // Stable client ref — avoids re-creating on every render
  const supabase = useRef(createClient()).current;

  const { unlocked, unlock, play } = useAudioAlert("/bell.mp3");

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: cafe } = await supabase
        .from("cafes")
        .select("id")
        .eq("user_id", user.id)
        .single();
        
      if (!cafe) return;
      
      const currentCafeId = cafe.id;
      setCafeId(currentCafeId);

      setLoadingMenu(true);
      const { data: items } = await supabase
        .from("menu_items").select("*").eq("cafe_id", currentCafeId).order("name");
      if (items) setMenuItems(items);
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
          // Prepend to top so it appears first in the list
          setOrders((prev) => [newOrder, ...prev]);
          // 🔔 Play the bell
          play();
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

  async function handleAcceptOrder(id: string) {
    const updated: Order["order_status"] = "preparing";
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, order_status: updated } : o))
    );
    await supabase.from("orders").update({ order_status: updated }).eq("id", id);
  }

  function handleStatusChange(id: string, status: Order["order_status"]) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, order_status: status } : o))
    );
    supabase.from("orders").update({ order_status: status }).eq("id", id);
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const incomingOrders = orders.filter((o) => o.order_status === "pending");
  const cookingOrders = orders.filter((o) => o.order_status === "preparing");
  const doneOrders = orders.filter((o) => o.order_status === "done");

  return (
    <div className="min-h-dvh flex flex-col bg-[#0d0d0f] max-w-md mx-auto">

      {/* ── Audio unlock banner ── */}
      {!unlocked && (
        <button
          onClick={unlock}
          className="w-full bg-yellow-400/10 border-b border-yellow-400/25 px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-yellow-400/15 active:bg-yellow-400/20"
        >
          <span className="text-xl shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-yellow-300 text-sm font-semibold leading-tight">Enable order alerts</p>
            <p className="text-yellow-400/60 text-xs mt-0.5">Tap to hear a bell when new orders arrive</p>
          </div>
          <span className="text-yellow-400/60 text-xs font-medium shrink-0 border border-yellow-400/30 px-2 py-1 rounded-lg">
            Tap
          </span>
        </button>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[#0d0d0f]/90 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">Q</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">Dashboard</p>
              <p className="text-white/40 text-xs">
                {incomingOrders.length > 0
                  ? `${incomingOrders.length} order${incomingOrders.length > 1 ? "s" : ""} waiting`
                  : unlocked ? "Listening for orders 👂" : "All caught up 👍"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {incomingOrders.length > 0 && (
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping" />
            )}
            {unlocked && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Alerts active" />
            )}
          </div>
        </div>
      </header>

      {/* ── Stats strip ── */}
      <div className="flex gap-3 px-4 py-3">
        <div className="flex-1 bg-yellow-400/10 rounded-xl p-3 border border-yellow-400/20">
          <p className="text-yellow-400/70 text-xs">Incoming</p>
          <p className="text-yellow-300 font-bold text-xl">{incomingOrders.length}</p>
        </div>
        <div className="flex-1 bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
          <p className="text-blue-400/70 text-xs">Cooking</p>
          <p className="text-blue-300 font-bold text-xl">{cookingOrders.length}</p>
        </div>
        <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-white/40 text-xs">Done today</p>
          <p className="text-white font-bold text-xl">{doneOrders.length}</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <TabBar active={tab} onChange={setTab} pendingCount={incomingOrders.length} />

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto pb-6">
        {tab === "orders" && (
          <div className="px-4 space-y-3">

            {/* QR Code Section */}
            {cafeId && (
              <div className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-2 flex items-center justify-between gap-4 print:bg-white print:border-black print:p-0">
                <div>
                  <h3 className="text-white font-bold text-base leading-tight print:text-black">Your Table QR Code</h3>
                  <p className="text-white/50 text-xs mt-1 print:text-black/70">Scan to view the menu and order.</p>
                  <button
                    onClick={() => window.print()}
                    className="mt-3 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/20 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 print:hidden"
                  >
                    <span>🖨️</span> Print QR
                  </button>
                </div>
                <div className="bg-white p-2 rounded-xl shrink-0">
                  <QRCode 
                    value={`https://quickorder-saas.pages.dev/${cafeId}`} 
                    size={80}
                    level="H"
                  />
                </div>
              </div>
            )}

            {/* Incoming yellow tickets section */}
            {incomingOrders.length > 0 && (
              <div className="space-y-3">
                <p className="text-yellow-300/70 text-xs font-semibold uppercase tracking-widest px-1 pt-1">
                  🔔 Incoming Orders
                </p>
                {incomingOrders.map((order) => (
                  <IncomingTicket key={order.id} order={order} onAccept={handleAcceptOrder} />
                ))}
              </div>
            )}

            {/* Cooking orders */}
            {cookingOrders.length > 0 && (
              <div className="space-y-3">
                {incomingOrders.length > 0 && (
                  <p className="text-blue-400/70 text-xs font-semibold uppercase tracking-widest px-1 pt-2">
                    🍳 In the Kitchen
                  </p>
                )}
                {cookingOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {incomingOrders.length === 0 && cookingOrders.length === 0 && (
              <div className="py-16 text-center">
                <span className="text-5xl">🎉</span>
                <p className="text-white font-semibold mt-4">No active orders</p>
                <p className="text-white/40 text-sm mt-1">
                  New orders will appear here instantly.
                </p>
              </div>
            )}

            {/* Completed section */}
            {doneOrders.length > 0 && (
              <div className="pt-2">
                <p className="text-white/25 text-xs font-semibold uppercase tracking-widest mb-3 px-1">
                  Completed
                </p>
                <div className="space-y-2">
                  {doneOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "menu" && (
          <div className="px-4">
            {loadingMenu && (
              <div className="py-8 flex justify-center">
                <span className="w-6 h-6 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" />
              </div>
            )}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              {menuItems.map((item) => (
                <MenuItemRow key={item.id} item={item} onToggle={handleToggleItem} />
              ))}
            </div>
            <p className="text-white/25 text-xs text-center mt-4">
              {menuItems.filter((i) => i.is_available).length} of {menuItems.length} items live
            </p>

            {/* FAB */}
            <div className="fixed bottom-6 right-6 pointer-events-none max-w-md mx-auto w-full"
              style={{ left: "50%", transform: "translateX(-50%)", width: "calc(min(448px, 100vw) - 48px)", maxWidth: 400 }}>
              <div className="flex justify-end pointer-events-auto">
                <button className="w-14 h-14 rounded-2xl bg-orange-500 text-white shadow-xl shadow-orange-500/30 flex items-center justify-center text-2xl hover:brightness-110 active:scale-95 transition-all">
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
