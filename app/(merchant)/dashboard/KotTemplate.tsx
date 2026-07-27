import React from "react";

interface KotTemplateProps {
  order: any;
}

export default function KotTemplate({ order }: KotTemplateProps) {
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

  return (
    <div className="w-[80mm] p-2 text-black font-mono text-xs bg-white leading-normal">
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

        <div className="text-[9px] flex justify-between mt-1 font-bold">
          <span>Biller: {order.customer_name || "Staff"}</span>
          <span>Type: {order.customer_name ? "Scan & Pay" : "Walk-in"}</span>
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
      
      <div className="text-center mt-4 pt-2 border-t border-black text-[8px] space-y-0.5 uppercase tracking-wide">
        <p className="font-bold">KOT - Kitchen Copy</p>
      </div>
    </div>
  );
}
