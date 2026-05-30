const fs = require('fs');
const file = 'app/(merchant)/dashboard/page.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

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

// Splice Orders tab (lines 631 to 779 -> indices 630 to 778)
// 778 - 630 + 1 = 149 lines to remove
lines.splice(630, 149, ...ordersTabNew.split('\n'));

// Now we need to find the new index for `tab === "menu"`
// since the array length changed.
const newCode = lines.join('\n');
fs.writeFileSync(file, newCode);
console.log('Orders Tab updated');
