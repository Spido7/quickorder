'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  cafe_id: string;
  table_number: string | null;
  total_amount: number;
  cart_items: any;
  order_status: string;
  created_at: string;
}

export default function AnalyticsClient({
  cafe,
  initialOrders,
}: {
  cafe: { id: string; business_name: string };
  initialOrders: Order[];
}) {
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sort states
  const [itemSort, setItemSort] = useState<'qty_desc' | 'qty_asc' | 'rev_desc' | 'rev_asc'>('qty_desc');
  const [tableSort, setTableSort] = useState<'rev_desc' | 'rev_asc' | 'orders_desc' | 'orders_asc'>('rev_desc');

  // 1. Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (dateRange === 'all') return initialOrders;

    const now = new Date();
    let cutoff = new Date();

    if (dateRange === 'today') {
      cutoff.setHours(0, 0, 0, 0); // Start of today (local time)
    } else if (dateRange === '7days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (dateRange === '30days') {
      cutoff.setDate(now.getDate() - 30);
    }

    const cutoffMs = cutoff.getTime();
    return initialOrders.filter((order) => new Date(order.created_at).getTime() >= cutoffMs);
  }, [initialOrders, dateRange]);

  // 2. Aggregate Item Sales dynamically based on filtered orders
  const itemSales = useMemo(() => {
    const itemMap: Record<string, { quantity: number; revenue: number }> = {};
    
    filteredOrders.forEach((o) => {
      const items = Array.isArray(o.cart_items) ? o.cart_items : [];
      items.forEach((item: any) => {
        if (item && item.name) {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          if (!itemMap[item.name]) {
            itemMap[item.name] = { quantity: 0, revenue: 0 };
          }
          itemMap[item.name].quantity += qty;
          itemMap[item.name].revenue += price * qty;
        }
      });
    });

    return Object.entries(itemMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [filteredOrders, searchQuery]);

  // 3. Aggregate Table Sales dynamically based on filtered orders
  const tableSales = useMemo(() => {
    const tableMap: Record<string, { ordersCount: number; revenue: number }> = {};

    filteredOrders.forEach((o) => {
      const tableNum = o.table_number === '0' ? 'Counter' : o.table_number ? `Table ${o.table_number}` : 'Takeaway';
      if (!tableMap[tableNum]) {
        tableMap[tableNum] = { ordersCount: 0, revenue: 0 };
      }
      tableMap[tableNum].ordersCount += 1;
      tableMap[tableNum].revenue += o.total_amount || 0;
    });

    return Object.entries(tableMap)
      .map(([table, stats]) => ({ table, ...stats }))
      .filter((t) => t.table.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [filteredOrders, searchQuery]);

  // 4. Sort Item Sales
  const sortedItemSales = useMemo(() => {
    const items = [...itemSales];
    items.sort((a, b) => {
      if (itemSort === 'qty_desc') return b.quantity - a.quantity;
      if (itemSort === 'qty_asc') return a.quantity - b.quantity;
      if (itemSort === 'rev_desc') return b.revenue - a.revenue;
      if (itemSort === 'rev_asc') return a.revenue - b.revenue;
      return 0;
    });
    return items;
  }, [itemSales, itemSort]);

  // 5. Sort Table Sales
  const sortedTableSales = useMemo(() => {
    const tables = [...tableSales];
    tables.sort((a, b) => {
      if (tableSort === 'rev_desc') return b.revenue - a.revenue;
      if (tableSort === 'rev_asc') return a.revenue - b.revenue;
      if (tableSort === 'orders_desc') return b.ordersCount - a.ordersCount;
      if (tableSort === 'orders_asc') return a.ordersCount - b.ordersCount;
      return 0;
    });
    return tables;
  }, [tableSales, tableSort]);

  // 6. Dynamic KPIs
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [filteredOrders]);

  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Order status counts
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, preparing: 0, done: 0, cancelled: 0 };
    filteredOrders.forEach((o) => {
      if (o.order_status in counts) {
        counts[o.order_status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [filteredOrders]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-black font-sans">
      
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white border-b-2 border-black w-full no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-4 w-full">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-black font-black text-xs border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0px_0px_#000] cursor-pointer hover:bg-zinc-50 transition-colors rounded-none"
            >
              ← Back
            </Link>
            <div>
              <h1 className="font-display font-black text-black text-sm leading-tight uppercase tracking-tight">
                Analytics Dashboard
              </h1>
              <p className="text-black/60 text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap">
                {cafe.business_name}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
        
        {/* ── Toolbar / Filters ── */}
        <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Date range filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase text-black/60 mr-2">Timeframe:</span>
            {(['all', 'today', '7days', '30days'] as const).map((range) => {
              const label = range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === '7days' ? '7 Days' : '30 Days';
              const active = dateRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`text-xs font-black uppercase border-2 border-black px-3 py-1.5 cursor-pointer transition-all shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none ${
                    active ? 'bg-warning text-black' : 'bg-white text-black hover:bg-zinc-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search bar input */}
          <div className="relative flex items-center min-w-[260px]">
            <input
              type="text"
              placeholder="Search items or tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold border-2 border-black px-4 py-2 bg-white text-black focus:outline-none focus:border-accent rounded-none shadow-[2px_2px_0_0_#000]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 font-black text-xs text-black/50 hover:text-black"
              >
                ✕
              </button>
            )}
          </div>

        </div>

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-2 border-black p-6 bg-white shadow-[4px_4px_0_0_#000]">
            <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Total Revenue</h3>
            <p className="text-3xl font-display font-black text-black mt-2">₹{totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="border-2 border-black p-6 bg-white shadow-[4px_4px_0_0_#000]">
            <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Total Orders</h3>
            <p className="text-3xl font-display font-black text-black mt-2">{totalOrders}</p>
          </div>
          
          <div className="border-2 border-black p-6 bg-white shadow-[4px_4px_0_0_#000]">
            <h3 className="text-xs font-black uppercase tracking-wider text-black/60">Avg Order Value</h3>
            <p className="text-3xl font-display font-black text-black mt-2">₹{avgOrderValue.toLocaleString()}</p>
          </div>
        </div>

        {/* ── Detailed Breakdown Tables ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Detailed Item Sales */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-4 border-black pb-2">
              <h2 className="text-lg font-display font-black uppercase tracking-tight text-black">
                Item Sales Detail
              </h2>
              <span className="text-xs font-black uppercase px-2 py-0.5 bg-black text-white">
                {sortedItemSales.length} item{sortedItemSales.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="border-2 border-black bg-white shadow-[4px_4px_0_0_#000] overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 border-b-2 border-black sticky top-0 z-10">
                  <tr className="uppercase text-[10px] font-black tracking-wider text-black/60">
                    <th className="p-3 border-r-2 border-black">Item Name</th>
                    <th 
                      onClick={() => setItemSort(itemSort === 'qty_desc' ? 'qty_asc' : 'qty_desc')}
                      className="p-3 border-r-2 border-black cursor-pointer hover:bg-zinc-150 select-none text-center"
                    >
                      Qty Sold {itemSort.startsWith('qty') ? (itemSort === 'qty_desc' ? '▼' : '▲') : '↕'}
                    </th>
                    <th 
                      onClick={() => setItemSort(itemSort === 'rev_desc' ? 'rev_asc' : 'rev_desc')}
                      className="p-3 cursor-pointer hover:bg-zinc-150 select-none text-right"
                    >
                      Revenue {itemSort.startsWith('rev') ? (itemSort === 'rev_desc' ? '▼' : '▲') : '↕'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItemSales.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-xs font-bold text-black/50">
                        No item sales found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedItemSales.map((item, idx) => {
                      const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30';
                      return (
                        <tr key={item.name} className={`border-b border-black/10 last:border-0 ${rowBg} hover:bg-zinc-50`}>
                          <td className="p-3 border-r-2 border-black font-black text-xs uppercase text-black">{item.name}</td>
                          <td className="p-3 border-r-2 border-black font-bold text-xs text-center text-black">{item.quantity}</td>
                          <td className="p-3 font-mono font-bold text-xs text-right text-black">₹{item.revenue.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Table / Source Sales */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-4 border-black pb-2">
              <h2 className="text-lg font-display font-black uppercase tracking-tight text-black">
                Table / Source Sales
              </h2>
              <span className="text-xs font-black uppercase px-2 py-0.5 bg-black text-white">
                {sortedTableSales.length} source{sortedTableSales.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="border-2 border-black bg-white shadow-[4px_4px_0_0_#000] overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 border-b-2 border-black sticky top-0 z-10">
                  <tr className="uppercase text-[10px] font-black tracking-wider text-black/60">
                    <th className="p-3 border-r-2 border-black">Source</th>
                    <th 
                      onClick={() => setTableSort(tableSort === 'orders_desc' ? 'orders_asc' : 'orders_desc')}
                      className="p-3 border-r-2 border-black cursor-pointer hover:bg-zinc-150 select-none text-center"
                    >
                      Orders {tableSort.startsWith('orders') ? (tableSort === 'orders_desc' ? '▼' : '▲') : '↕'}
                    </th>
                    <th 
                      onClick={() => setTableSort(tableSort === 'rev_desc' ? 'rev_asc' : 'rev_desc')}
                      className="p-3 cursor-pointer hover:bg-zinc-150 select-none text-right"
                    >
                      Revenue {tableSort.startsWith('rev') ? (tableSort === 'rev_desc' ? '▼' : '▲') : '↕'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTableSales.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-xs font-bold text-black/50">
                        No table/counter sales found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedTableSales.map((item, idx) => {
                      const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30';
                      return (
                        <tr key={item.table} className={`border-b border-black/10 last:border-0 ${rowBg} hover:bg-zinc-50`}>
                          <td className="p-3 border-r-2 border-black font-black text-xs uppercase text-black">{item.table}</td>
                          <td className="p-3 border-r-2 border-black font-bold text-xs text-center text-black">{item.ordersCount}</td>
                          <td className="p-3 font-mono font-bold text-xs text-right text-black">₹{item.revenue.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ── Status Summary Section ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-display font-black uppercase tracking-tight text-black border-b-4 border-black pb-2 inline-block">
            Order Status Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000] text-center">
              <p className="text-xs font-black text-black/60 uppercase">Pending</p>
              <p className="text-2xl font-black text-black mt-1">{statusCounts.pending}</p>
            </div>
            <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000] text-center">
              <p className="text-xs font-black text-black/60 uppercase">Preparing</p>
              <p className="text-2xl font-black text-accent mt-1">{statusCounts.preparing}</p>
            </div>
            <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000] text-center">
              <p className="text-xs font-black text-black/60 uppercase">Completed</p>
              <p className="text-2xl font-black text-success mt-1">{statusCounts.done}</p>
            </div>
            <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000] text-center">
              <p className="text-xs font-black text-black/60 uppercase">Cancelled</p>
              <p className="text-2xl font-black text-black/40 mt-1">{statusCounts.cancelled}</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
