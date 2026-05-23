// Temporary dev-only preview page — shows the customer menu with hardcoded mock data.
// This lets you verify the UI without needing a Supabase connection.
// DELETE this file before going to production.

import MenuClient from "@/app/[cafeId]/MenuClient";

const MOCK_CAFE = {
  id: "preview",
  business_name: "Chai Corner",
  upi_id: "chaicorner@upi",
  has_seating: true,
};

const MOCK_ITEMS = [
  { id: "1", name: "Masala Chai", price: 30 },
  { id: "2", name: "Vada Pav", price: 25 },
  { id: "3", name: "Samosa (2 pcs)", price: 20 },
  { id: "4", name: "Paneer Sandwich", price: 60 },
  { id: "5", name: "Cold Coffee", price: 80 },
  { id: "6", name: "Aloo Paratha", price: 70 },
  { id: "7", name: "Pav Bhaji", price: 90 },
  { id: "8", name: "Dahi Puri (6 pcs)", price: 55 },
];

export default function PreviewMenuPage() {
  return <MenuClient cafe={MOCK_CAFE} items={MOCK_ITEMS} />;
}
