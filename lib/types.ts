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
  category?: string | null;
  category_id?: string | null;
}

export type OrderStatus = "pending" | "preparing" | "done" | "cancelled";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Coupon {
  id: string;
  merchant_id: string;
  code: string;
  discount_type: "flat" | "percentage";
  discount_value: number;
  min_order_value: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  cafe_id: string;
  table_number: string | null;
  customer_name: string | null;
  total_amount: number;
  cart_items: CartItem[];
  order_status: OrderStatus;
  payment_status: string;
  coupon_id: string | null;
  discount_amount: number;
  created_at: string;
  scheduled_at: string | null;
  fulfillment_type?: string | null;
  hostel_block?: string | null;
  room_number?: string | null;
  notes?: string | null;
}
