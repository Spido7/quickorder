"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem, Order } from "@/lib/types";

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
const OrderCard = memo(function OrderCard({ order, onStatusChange }: {
  order: Order;
  onStatusChange: (id: string, status: Order["order_status"]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [timeText, setTimeText] = useState("");
  const [isOverTime, setIsOverTime] = useState(false);
  const isCompleted = order.order_status === "done";
  const [isExpanded, setIsExpanded] = useState(!isCompleted);

  useEffect(() => {
    const updateTime = () => {
      if (order.scheduled_at) {
        const scheduledTime = new Date(order.scheduled_at).getTime();
        const diffMs = scheduledTime - Date.now();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMs > 0) {
          setTimeText(
            `Scheduled in ${diffMins}m (${new Date(order.scheduled_at).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })})`
          );
          setIsOverTime(false);
        } else {
          const overdueMins = Math.abs(diffMins);
          setTimeText(`Due ${overdueMins}m ago`);
          setIsOverTime(overdueMins >= 5);
        }
      } else {
        const diffMs = Date.now() - new Date(order.created_at).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {
          setTimeText(`0m ago`);
          setIsOverTime(false);
        } else {
          setTimeText(`${diffMins}m ago`);
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
  const location = order.table_number === "0" 
    ? "Counter" 
    : order.table_number 
      ? `Table ${order.table_number}` 
      : "Takeaway";

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
            onClick={() => handleAction("preparing")}
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
export default function DashboardClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [subTab, setSubTab] = useState<"incoming" | "cooking" | "completed">("incoming");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [cafeDetails, setCafeDetails] = useState<{
    id: string;
    business_name: string;
    has_seating: boolean;
    table_count: number | null;
  } | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("0");
  const [printMode, setPrintMode] = useState<"single" | "all">("single");
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: cafe } = await supabase
        .from("cafes")
        .select("id, business_name, has_seating, table_count")
        .eq("id", user.id)
        .single();

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
          // Prepend to top so it appears first in the list
          setOrders((prev) => [newOrder, ...prev]);
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

  async function handleAcceptOrder(id: string) {
    const updated: Order["order_status"] = "preparing";
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, order_status: updated } : o))
    );
    await supabase.from("orders").update({ order_status: updated }).eq("id", id);
  }

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
    <div className="min-h-dvh flex flex-col bg-background w-full max-w-7xl xl:max-w-[1440px] mx-auto text-black">

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
            <button
              onClick={() => router.push("/dashboard/coupons")}
              className="text-black font-black text-xs border-2 border-black bg-white px-2 py-1.5 sm:px-3 shadow-[2px_2px_0px_0px_#000] cursor-pointer hover:bg-zinc-50 transition-all flex items-center justify-center gap-1 rounded-none min-h-[36px]"
            >
              <span>🎟️</span>
              <span className="hidden sm:inline">Coupons</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/settings")}
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
                      <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
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
                      <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
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
          {printMode === "single" ? (
            <div className="flex flex-col items-center justify-center p-8 bg-white min-h-[600px]">
              <div className="border-4 border-black bg-[#f5f2eb] p-8 flex flex-col items-center justify-center text-center w-[250px] h-[360px] shadow-[6px_6px_0px_0px_#000]">
                <h2 className="font-display font-black text-xl uppercase tracking-tight text-black mb-1">{cafeDetails?.business_name}</h2>
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
                {cafeDetails?.business_name} — QR Code Sheet
              </h1>
              <div className="grid grid-cols-2 gap-8 justify-items-center">
                {/* Counter QR card */}
                <div className="border-4 border-black bg-[#f5f2eb] p-6 flex flex-col items-center justify-center text-center w-[220px] h-[320px] shadow-[4px_4px_0px_0px_#000] break-inside-avoid">
                  <h2 className="font-display font-black text-lg uppercase tracking-tight text-black mb-1">{cafeDetails?.business_name}</h2>
                  <div className="my-4 p-2 bg-white border-2 border-black">
                    <QRCode value={`${origin || "https://quickorder.pages.dev"}/${cafeId}?table=0`} size={120} level="H" />
                  </div>
                  <p className="font-display font-black text-sm uppercase tracking-wider text-black bg-warning border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
                    COUNTER
                  </p>
                  <p className="text-[10px] font-black uppercase text-black/60 tracking-widest mt-3">SCAN TO ORDER</p>
                </div>

                {/* Table QR cards */}
                {cafeDetails?.table_count && Array.from({ length: cafeDetails.table_count }, (_, i) => {
                  const num = String(i + 1);
                  return (
                    <div key={num} className="border-4 border-black bg-[#f5f2eb] p-6 flex flex-col items-center justify-center text-center w-[220px] h-[320px] shadow-[4px_4px_0px_0px_#000] break-inside-avoid">
                      <h2 className="font-display font-black text-lg uppercase tracking-tight text-black mb-1">{cafeDetails?.business_name}</h2>
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

