const fs = require('fs');
const file = 'app/(merchant)/dashboard/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Fix MenuItemRow
code = code.replace(
  '    <div className="flex items-center gap-4 px-4 py-4 min-h-[72px] border-b-2 border-black bg-white last:border-b-0 text-black">',
  '    <div className="flex items-center gap-4 px-4 py-4 min-h-[72px] bg-white text-black h-full">'
);

// 2. Wrap QR logic into renderQRCodeSection
const qrMatch = code.match(/(\{\/\* QR Code Section \*\/\}\s*\{cafeId && \([\s\S]*?\}\s*<\/div>\s*\)\})/);
if(qrMatch) {
  const qrCodeContent = qrMatch[1];
  const renderFn = `  const renderQRCodeSection = () => {
    return (
      <>
        ` + qrCodeContent.replace('{/* QR Code Section */}', '') + `
      </>
    );
  };
  `;

  code = code.replace(
    '  const incomingOrders = orders.filter((o) => o.order_status === "pending");',
    renderFn + '\n  const incomingOrders = orders.filter((o) => o.order_status === "pending");'
  );
} else {
  console.log("Could not extract QR logic");
}

// 3. Update main container
code = code.replace(
  '<div className="min-h-dvh flex flex-col bg-background max-w-md mx-auto text-black">',
  '<div className="min-h-dvh flex flex-col bg-background w-full max-w-md xl:max-w-7xl mx-auto text-black">'
);

// 4. Update Stats Strip
code = code.replace(
  '<div className="no-print flex gap-3 px-4 py-3">',
  '<div className="no-print flex gap-3 px-4 py-3 xl:hidden">'
);

// 5. Build New Orders Tab
const ordersTabNew = `{tab === "orders" && (
          <div className="px-4 flex flex-col xl:grid xl:grid-cols-3 gap-6 pt-2">

            {/* Mobile QR */}
            <div className="xl:hidden">
              {renderQRCodeSection()}
            </div>

            {/* Column 1: Incoming */}
            <div className="space-y-3 xl:border-r-2 xl:border-black xl:pr-6">
              <div className="hidden xl:flex justify-between items-end mb-4 px-1">
                <p className="text-black font-black text-xs uppercase tracking-widest">🔔 Incoming</p>
                <p className="text-black font-display font-black text-2xl leading-none">{incomingOrders.length}</p>
              </div>
              {incomingOrders.length > 0 && (
                <>
                  <p className="xl:hidden text-black font-black text-xs uppercase tracking-widest px-1 pt-1">
                    🔔 Incoming Orders
                  </p>
                  {incomingOrders.map((order) => (
                    <IncomingTicket key={order.id} order={order} onAccept={handleAcceptOrder} />
                  ))}
                </>
              )}
            </div>

            {/* Column 2: Cooking */}
            <div className="space-y-3 xl:border-r-2 xl:border-black xl:pr-6">
              <div className="hidden xl:flex justify-between items-end mb-4 px-1">
                <p className="text-black font-black text-xs uppercase tracking-widest">🍳 Cooking</p>
                <p className="text-black font-display font-black text-2xl leading-none">{cookingOrders.length}</p>
              </div>
              {cookingOrders.length > 0 && (
                <>
                  {incomingOrders.length > 0 && (
                    <p className="xl:hidden text-black font-black text-xs uppercase tracking-widest px-1 pt-2">
                      🍳 In the Kitchen
                    </p>
                  )}
                  {cookingOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                  ))}
                </>
              )}
              {incomingOrders.length === 0 && cookingOrders.length === 0 && (
                <div className="py-16 text-center border-2 border-black bg-white rounded-none shadow-[4px_4px_0px_0px_#000]">
                  <span className="text-5xl">🎉</span>
                  <p className="text-black font-black uppercase tracking-tight mt-4">No active orders</p>
                  <p className="text-black/60 text-sm font-bold mt-1">
                    New orders will appear here instantly.
                  </p>
                </div>
              )}
            </div>

            {/* Column 3: Completed & Desktop QR */}
            <div className="space-y-6">
              <div className="hidden xl:block">
                {renderQRCodeSection()}
              </div>
              {doneOrders.length > 0 && (
                <div className="pt-2">
                  <div className="flex justify-between items-end mb-3 px-1">
                    <p className="text-black/65 font-black text-xs uppercase tracking-widest">Completed</p>
                    <p className="hidden xl:block text-black/65 font-display font-black text-2xl leading-none">{doneOrders.length}</p>
                  </div>
                  <div className="space-y-3">
                    {doneOrders.slice(0, 5).map((order) => (
                      <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}`;

const ordersOldMatch = code.match(/\{tab === "orders" && \([\s\S]*?\}\s*<\/div>\s*\)\s*\}/);
if (ordersOldMatch) {
  code = code.replace(ordersOldMatch[0], ordersTabNew);
} else {
  console.log("Could not match orders tab");
}

// 6. Build New Menu Tab
const menuTabNew = `{tab === "menu" && (
          <div className="px-4">
            {loadingMenu && (
              <div className="py-8 flex justify-center">
                <span className="w-6 h-6 border-2 border-black border-t-accent rounded-full animate-spin" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <div key={item.id} className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_#000] overflow-hidden">
                  <MenuItemRow item={item} onToggle={handleToggleItem} />
                </div>
              ))}
            </div>
            <p className="text-black/60 text-xs font-bold uppercase tracking-wider text-center mt-6">
              {menuItems.filter((i) => i.is_available).length} of {menuItems.length} items live
            </p>

            {/* FAB */}
            <div className="fixed bottom-6 right-6 pointer-events-none w-full flex justify-end xl:max-w-7xl max-w-md mx-auto px-4 xl:px-8"
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
        )}`;

const menuOldMatch = code.match(/\{tab === "menu" && \([\s\S]*?\}\s*<\/div>\s*\)\s*\}/);
if (menuOldMatch) {
  code = code.replace(menuOldMatch[0], menuTabNew);
} else {
  console.log("Could not match menu tab");
}

fs.writeFileSync(file, code);
console.log('Update complete');
