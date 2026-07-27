import React from "react";

interface ReceiptTemplateProps {
  order: any;
  cafe: any;
}

export default function ReceiptTemplate({ order, cafe }: ReceiptTemplateProps) {
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  const isRoomDelivery = order.fulfillment_type === "room_delivery";
  const fulfillmentBadge = isRoomDelivery
    ? `🚪 Room Delivery (Block ${order.block_number || "X"} - Room ${order.room_number || "Y"})`
    : "🏃 Counter Pick Up";

  // Calculations for Bottom Section (Customer Invoice)
  const grandTotal = Number(order.total_amount || 0);
  const subtotal = grandTotal * 0.95;
  const cgst = grandTotal * 0.025;
  const sgst = grandTotal * 0.025;

  return (
    <div className="hidden print:block w-[80mm] p-2 text-black font-mono text-xs bg-white leading-normal">
      {/* ─── TOP SECTION (Kitchen Order Ticket / KOT) ─── */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h2 className="text-xs font-bold uppercase tracking-tight">KITCHEN ORDER TICKET (KOT)</h2>
        <div className="flex justify-between text-[9px] mt-1">
          <span>KOT ID: #{order.id?.slice(0, 5)}</span>
          <span>{formattedDate}</span>
        </div>
        
        {/* High-contrast fulfillment badge */}
        <div className="my-2 p-1 border-2 border-black bg-black text-white text-center font-bold text-[9px] uppercase tracking-wide">
          {fulfillmentBadge}
        </div>
      </div>

      {/* KOT Items List */}
      <div className="mb-2">
        <table className="w-full text-left text-[9px] border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="pb-1">Item</th>
              <th className="pb-1 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {order.cart_items?.map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-dotted border-gray-300">
                <td className="py-1">
                  <div className="font-bold">{item.name}</div>
                  {item.notes && <div className="text-[8px] font-normal text-gray-700">Note: {item.notes}</div>}
                </td>
                <td className="py-1 text-right font-bold">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── TEAR LINE ─── */}
      <div className="text-center my-4 border-t border-b border-dashed border-black py-1 text-[8px] font-bold uppercase tracking-wider">
        - - - - - - Tear KOT Here - - - - - -
      </div>

      {/* ─── BOTTOM SECTION (Customer Invoice) ─── */}
      <div className="text-center pb-2 mb-2">
        <h1 className="text-xs font-bold uppercase">{cafe?.business_name || "QuickOrder Cafe"}</h1>
        {cafe?.address && <p className="text-[8px] leading-tight mb-1">{cafe.address}</p>}
        
        <div className="inline-block px-1 py-0.5 border border-black font-bold text-[8px] uppercase tracking-wider bg-white my-1">
          ✓ PAID
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
        {order.table_number && (
          <div className="flex justify-between">
            <span>Table/Room: {order.table_number}</span>
          </div>
        )}
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
