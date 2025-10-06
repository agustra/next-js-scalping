"use client";
import React, { useEffect, useState } from "react";
import { useSidebar } from "@/context/SidebarContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";

type BandarResult = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  signal: string;
  signalStrength: number;
  bandarSignal: string;
  bandarConfidence: number;
  bandarPattern: string;
  indicators: { rsi: number | null; sma10: number | null; ema5: number | null; vwap?: number | null };
  bias?: string;
  pressure?: number;
  riskLevel?: string;
  dayTradePotential?: {
    targetPrice: number;
    stopLoss: number;
    riskReward: string;
    timeframe: string;
    positionSize: string;
    maxHoldTime: string;
  };
};

function isMarketOpen() {
  const now = new Date();
  const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
  const day = jakartaTime.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hour = jakartaTime.getHours();
  const minute = jakartaTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  
  // IDX trading hours: Monday-Friday, 09:00-16:00 WIB
  const isWeekday = day >= 1 && day <= 5;
  const isWithinTradingHours = timeInMinutes >= 540 && timeInMinutes < 960; // 09:00-16:00
  
  return isWeekday && isWithinTradingHours;
}

export default function BandarDashboard() {
  const { toggleSidebar, toggleMobileSidebar, isExpanded, isMobileOpen } = useSidebar();
  const [endpoint, setEndpoint] = useState<string>("/api/bandar-scanner");
  const [pollMs, setPollMs] = useState<number>(10000);
  const [data, setData] = useState<BandarResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterSignal, setFilterSignal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bandar-filter-signal') || 'ALL';
    }
    return 'ALL';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('bandar-items-per-page')) || 20;
    }
    return 20;
  });
  const [autoRefresh, setAutoRefresh] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bandar-auto-refresh');
      return saved ? JSON.parse(saved) : isMarketOpen();
    }
    return isMarketOpen();
  });
  const [showChartInfo, setShowChartInfo] = useState(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('bandar-show-chart-info') || 'false');
    }
    return false;
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-close sidebar on page load
  useEffect(() => {
    if (isExpanded || isMobileOpen) {
      if (window.innerWidth >= 1024 && isExpanded) {
        toggleSidebar();
      } else if (window.innerWidth < 1024 && isMobileOpen) {
        toggleMobileSidebar();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run only on mount

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const payload = await res.json();
        const stocks: BandarResult[] = payload.stocks || payload.data || payload;
        if (!mounted) return;
        setData(stocks);
        setLastUpdated(new Date(payload.timestamp || payload.updated || Date.now()).toLocaleString());
      } catch (e: unknown) {
        const error = e as Error;
        if (!mounted) return;
        setError(error.message || "Failed to fetch");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    if (autoRefresh) {
      timer = setInterval(fetchData, pollMs);
    }

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [endpoint, pollMs, autoRefresh]);

  const filtered = data.filter((d) => {
    const matchesSignal = filterSignal === "ALL" ? true : d.signal === filterSignal;
    const matchesSearch = searchQuery === "" ? true : 
      d.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSignal && matchesSearch;
  });
  const totalPages = itemsPerPage >= filtered.length ? 1 : Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = itemsPerPage >= filtered.length ? filtered : filtered.slice(startIndex, startIndex + itemsPerPage);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('bandar-filter-signal', filterSignal);
  }, [filterSignal]);

  useEffect(() => {
    localStorage.setItem('bandar-items-per-page', itemsPerPage.toString());
  }, [itemsPerPage]);

  useEffect(() => {
    localStorage.setItem('bandar-auto-refresh', JSON.stringify(autoRefresh));
  }, [autoRefresh]);

  useEffect(() => {
    localStorage.setItem('bandar-show-chart-info', JSON.stringify(showChartInfo));
  }, [showChartInfo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSignal, searchQuery, itemsPerPage]);

  const topByConfidence = [...filtered]
    .sort((a, b) => b.bandarConfidence - a.bandarConfidence)
    .slice(0, 6);

  const chartData = topByConfidence.map((s) => ({
    name: s.symbol,
    price: Number(s.price),
    rsi: s.indicators.rsi ?? 0,
    volume: s.volume,
  }));

  function getRowColor(signal: string) {
    if (signal.includes("ACCUMULATION")) return "bg-emerald-50";
    if (signal.includes("DISTRIBUTION")) return "bg-red-50";
    return "bg-slate-50";
  }

  function explainBandar(s: BandarResult) {
    if (s.bandarSignal === "ACCUMULATION") {
      if ((s.indicators.rsi ?? 0) < 40) return "Volume tinggi, RSI rendah → potensi rebound.";
      return "Volume tinggi, harga stabil → kemungkinan akumulasi.";
    }
    if (s.bandarSignal === "DISTRIBUTION") {
      return "Harga turun dengan volume besar → potensi distribusi.";
    }
    return "Belum ada pola bandar jelas.";
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="w-full">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Bandar Scanner Dashboard</h1>
          <div className="text-sm text-slate-600">Last update: {lastUpdated ?? "-"}</div>
        </header>

        <section className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <label className="block text-xs text-slate-500">API Endpoint</label>
            <input
              className="mt-2 w-full border rounded px-3 py-2 text-sm"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
            <label className="block text-xs text-slate-500 mt-3">Polling (ms)  set waktu untuk refresh</label>
            <input
              className="mt-2 w-full border rounded px-3 py-2 text-sm"
              value={pollMs}
              onChange={(e) => setPollMs(Number(e.target.value))}
              type="number"
              min={2000}
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Auto Refresh:
                <span className={`ml-1 px-1 rounded text-xs ${isMarketOpen() ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {isMarketOpen() ? 'Market Open' : 'Market Closed'}
                </span>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 text-xs rounded ${autoRefresh ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-600">Filter:</div>
            <div className="mt-2 flex gap-2">
              {['ALL','STRONG_BUY','BUY','HOLD','SELL','STRONG_SELL'].map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 text-xs rounded ${filterSignal===s? 'bg-slate-800 text-white' : 'bg-slate-100'}`}
                  onClick={() => setFilterSignal(s)}
                >{s}</button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm md:col-span-2">
            <h3 className="font-medium mb-2">Top Signals Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topByConfidence.map((s) => (
                <div key={s.symbol} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{s.symbol}</div>
                    <div className="text-sm text-slate-500">{s.bandarSignal}</div>
                  </div>
                  <div className="text-xs text-slate-500">{s.name}</div>
                  <div className="mt-2 flex items-end gap-3">
                    <div className="text-lg font-bold">{s.price.toLocaleString()}</div>
                    <div className={`text-sm ${s.signal.includes('BUY') ? 'text-emerald-600' : s.signal.includes('SELL') ? 'text-red-600' : 'text-slate-500'}`}>
                      {s.signal} ({s.signalStrength.toFixed? s.signalStrength.toFixed(2) : s.signalStrength})
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Conf: {s.bandarConfidence}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Price & RSI (Top symbols)</h4>
              <button
                onClick={() => setShowChartInfo(!showChartInfo)}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                {showChartInfo ? 'Hide Info' : 'How to Read'}
              </button>
            </div>
            
            {showChartInfo && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <div className="font-medium mb-2">📊 Cara Membaca Chart Price & RSI:</div>
                <div className="space-y-1">
                  <div><strong>Price (Garis Hitam):</strong> Harga saham saat ini - trend naik/turun</div>
                  <div><strong>RSI (Garis Merah):</strong> Relative Strength Index (0-100)</div>
                  <div><strong>RSI &lt; 30:</strong> Oversold → Potensi beli</div>
                  <div><strong>RSI &gt; 70:</strong> Overbought → Potensi jual</div>
                  <div><strong>RSI 30-70:</strong> Normal range</div>
                  <div><strong>Divergence:</strong> Price naik tapi RSI turun = warning signal</div>
                </div>
              </div>
            )}
            
            <div style={{ width: "100%", height: showChartInfo ? 240 : 280 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" domain={["dataMin - 5", "dataMax + 5"]} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="price" stroke="#1f2937" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="rsi" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h4 className="font-medium mb-3">Volume (Top symbols)</h4>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => value.toLocaleString()} />
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString(), 'Volume']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="volume" barSize={20} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Scanner Results</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Show:</span>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={filtered.length || 999999}>All</option>
                </select>
                <span className="text-xs text-slate-600">per page</span>
              </div>
              <div className="text-sm text-slate-500">
                {itemsPerPage >= filtered.length 
                  ? `Showing all ${filtered.length} results`
                  : `Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} results`
                }
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="relative">
              <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                <svg className="fill-gray-500" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill=""></path>
                </svg>
              </span>
              <input 
                placeholder="Search symbol or company name..."
                className={`h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 ${searchQuery ? 'pr-10' : 'pr-4'}`}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )} 
            </div>
          </div>
          {loading && <div className="text-sm text-slate-500 mb-2">Loading...</div>}
          {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="p-2">No</th>
                  <th className="p-2">Symbol</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Signal</th>
                  <th className="p-2">Bandar</th>
                  <th className="p-2">Conf</th>
                  <th className="p-2">RSI</th>
                  <th className="p-2">EMA5</th>
                  <th className="p-2">SMA10</th>
                  <th className="p-2">Volume</th>
                  <th className="p-2">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((s, index) => (
                  <tr key={s.symbol} className={`border-t ${getRowColor(s.bandarSignal)}`}>
                    <td className="p-2 text-center text-slate-500">{startIndex + index + 1}</td>
                    <td className="p-2 font-medium">{s.symbol}</td>
                    <td className="p-2 text-slate-600">{s.name}</td>
                    <td className="p-2">{s.price.toLocaleString()}</td>
                    <td className={`p-2 ${s.signal.includes('BUY') ? 'text-emerald-600' : s.signal.includes('SELL') ? 'text-red-600' : 'text-slate-500'}`}>
                      {s.signal} ({s.signalStrength.toFixed? s.signalStrength.toFixed(1) : s.signalStrength})
                    </td>
                    <td className="p-2">{s.bandarSignal}</td>
                    <td className="p-2">{s.bandarConfidence}</td>
                    <td className="p-2">{s.indicators.rsi?.toFixed(1) ?? '-'}</td>
                    <td className="p-2">{s.indicators.ema5?.toFixed(0) ?? '-'}</td>
                    <td className="p-2">{s.indicators.sma10?.toFixed(0) ?? '-'}</td>
                    <td className="p-2">{s.volume.toLocaleString()}</td>
                    <td className="p-2 text-xs text-slate-600 max-w-xs">{explainBandar(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-slate-500">Page {currentPage} of {totalPages}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >Previous</button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${currentPage === pageNum ? 'bg-slate-800 text-white' : 'hover:bg-slate-50'}`}
                      >{pageNum}</button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}