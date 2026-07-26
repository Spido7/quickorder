'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function MasterDashboardClient({ cafes, orders }: { cafes: any[], orders: any[] }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // Aggregate Metrics
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const totalOrders = orders.length;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-black font-sans">
      
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white border-b-2 border-black w-full no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-4 w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_#ff6b35] shrink-0">
              <span className="text-white text-sm font-black">Q</span>
            </div>
            <div>
              <p className="font-display font-black text-black text-sm leading-tight uppercase tracking-tight">
                Master Panel
              </p>
              <p className="text-black/60 text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap">
                {cafes.length} Active Outlets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 justify-end">
            <button
              onClick={handleSignOut}
              className="text-black font-black text-xs border-2 border-black bg-white px-2 py-1.5 sm:px-3 shadow-[2px_2px_0px_0px_#000] cursor-pointer hover:bg-zinc-50 transition-all flex items-center justify-center gap-1 rounded-none min-h-[36px]"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 md:py-12 space-y-10">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-2 border-black p-6 bg-white shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000] transition-all">
            <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Total Revenue</h3>
            <p className="text-3xl font-display font-black text-black mt-2">₹{totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="border-2 border-black p-6 bg-white shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000] transition-all">
            <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Total Orders</h3>
            <p className="text-3xl font-display font-black text-black mt-2">{totalOrders}</p>
          </div>
          
          <div className="border-2 border-black p-6 bg-white shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000] transition-all">
            <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Avg Order Value</h3>
            <p className="text-3xl font-display font-black text-black mt-2">
               ₹{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0}
            </p>
          </div>
        </div>

        {/* Outlet Breakdown Matrix */}
        <div className="space-y-4">
          <h2 className="text-xl font-display font-black uppercase tracking-tight text-black border-b-4 border-black pb-2 inline-block">
            Outlet Breakdown
          </h2>
          
          <div className="border-2 border-black bg-white shadow-[4px_4px_0_0_#000] overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 border-b-2 border-black uppercase text-xs font-black tracking-wider text-black/60">
                  <th className="p-4 border-r-2 border-black">Outlet Name</th>
                  <th className="p-4 border-r-2 border-black">Orders Today</th>
                  <th className="p-4 border-r-2 border-black">Gross Revenue</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {cafes.map((cafe, index) => {
                  const cafeOrders = orders.filter(o => o.cafe_id === cafe.id);
                  const cafeRev = cafeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50';
                  
                  return (
                    <tr key={cafe.id} className={`border-b-2 border-black last:border-0 ${rowBg} hover:bg-warning/10 transition-colors`}>
                      <td className="p-4 border-r-2 border-black font-black text-lg text-black">{cafe.name}</td>
                      <td className="p-4 border-r-2 border-black font-bold text-sm text-black">{cafeOrders.length}</td>
                      <td className="p-4 border-r-2 border-black font-black text-sm text-success">₹{cafeRev.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link className="inline-block border-2 border-black bg-warning text-black hover:bg-black hover:text-white transition-all text-xs font-black uppercase px-4 py-2 shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none" href={`/dashboard/analytics?cafeId=${cafe.id}`}>
                            Analytics 📊
                          </Link>
                          <Link className="inline-block border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all text-xs font-black uppercase px-4 py-2 shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none" href={`/dashboard?cafeId=${cafe.id}`}>
                            Enter Kitchen ➔
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
