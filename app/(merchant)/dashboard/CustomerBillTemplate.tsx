import React from "react";

interface CustomerBillTemplateProps {
  order: any;
  cafe: any;
}

export default function CustomerBillTemplate({ order, cafe }: CustomerBillTemplateProps) {
  if (!order) return null;

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  const isRoomDelivery = order.fulfillment_type === "room_delivery";
  const fulfillmentBadge = isRoomDelivery
    ? `🚪 Room Delivery (Block ${order.hostel_block || "X"} - Room ${order.room_number || "Y"})`
    : "🏃 Counter Pick Up";

  // Calculations for Customer Invoice
  const grandTotal = Number(order.total_amount || 0);
  const subtotal = grandTotal * 0.95;
  const cgst = grandTotal * 0.025;
  const sgst = grandTotal * 0.025;

  const isPaid = order.payment_status?.toLowerCase() === "paid";

  return (
    <div className="w-[80mm] p-2 text-black font-mono text-xs bg-white leading-normal">
      <div className="text-center pb-2 mb-2 border-b border-black">
        <h1 className="text-xs font-bold uppercase">{cafe?.business_name || "QuickOrder Cafe"}</h1>
        {cafe?.address && <p className="text-[8px] leading-tight mb-1">{cafe.address}</p>}
        {cafe?.gstin && <p className="text-[8px] font-bold">GSTIN: {cafe.gstin}</p>}
        
        <div className={`inline-block px-1.5 py-0.5 border font-bold text-[8px] uppercase tracking-wider my-1 ${
          isPaid ? "border-green-600 text-green-600 bg-green-50" : "border-red-600 text-red-600 bg-red-50"
        }`}>
          {isPaid ? "✓ PAID" : "✗ UNPAID"}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="text-[9px] space-y-0.5 border-b border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>Customer: {order.customer_name || "Guest"}</span>
          <span>Bill No: #{order.id?.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span>Date: {formattedDate}</span>
          <span>Type: {fulfillmentBadge}</span>
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="mb-2">
        <table className="w-full text-left text-[9px] border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="pb-1">Item</th>
              <th className="pb-1 text-center">Qty</th>
              <th className="pb-1 text-right">Price</th>
              <th className="pb-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.cart_items?.map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-dotted border-gray-300">
                <td className="py-1">{item.name}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">₹{Number(item.price).toFixed(2)}</td>
                <td className="py-1 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax & Subtotal calculation */}
      <div className="border-t border-black pt-2 text-[9px] space-y-1">
        <div className="flex justify-between">
          <span>Subtotal (95%):</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>CGST (2.5%):</span>
          <span>₹{cgst.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>SGST (2.5%):</span>
          <span>₹{sgst.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-[9px] border-t border-dotted border-black pt-1">
          <span>Grand Total:</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pt-2 border-t border-black text-[8px] space-y-0.5 uppercase tracking-wide">
        <p className="font-bold">Thanks for Ordering!</p>
        <p className="text-gray-500">Powered by QuickOrder</p>
      </div>
    </div>
  );
}
