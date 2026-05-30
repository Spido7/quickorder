const fs = require('fs');
const file = 'app/(merchant)/dashboard/page.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const menuTabNew = `        {tab === "menu" && (
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
        )}`;

// Lines 707 to 722 are index 706 to 721. 721 - 706 + 1 = 16 lines.
lines.splice(706, 16, ...menuTabNew.split('\n'));

fs.writeFileSync(file, lines.join('\n'));
console.log('Menu Tab fixed');
