// Shared TypeScript types for the QR Menu system

export type SeatingType = "tables" | "takeaway";

export interface Cafe {
  id: string;
  business_name: string;
  upi_id: string;
  has_seating: boolean;
  table_count: number | null;
}

export interface MenuItem {
  id: string;
  cafe_id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export type OrderStatus = "pending" | "preparing" | "done" | "cancelled";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  cafe_id: string;
  table_number: string | null;
  total_amount: number;
  cart_items: CartItem[];
  order_status: OrderStatus;
  created_at: string;
}
