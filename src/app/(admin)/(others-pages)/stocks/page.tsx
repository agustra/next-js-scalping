"use client";
import { useEffect, useState } from "react";
import { api } from "@/services/api";

interface Stock {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume?: number;
  shortName: string;
  indicators?: {
    rsi: number | null;
    sma20: number | null;
    ema12: number | null;
  };
  signal?: string;
  signalStrength?: number;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stats, setStats] = useState({ totalIDX: 0, totalActive: 0, totalQuotes: 0 });
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'HOLD'>('ALL');
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change' | 'rsi'>('symbol');
  const [priceFilter, setPriceFilter] = useState({ min: 50, max: 100, enabled: true });

  const filteredStocks = stocks
    .filter(stock => {
      // Signal filter
      if (filter !== 'ALL' && stock.signal !== filter) return false;
      
      // Price filter
      if (priceFilter.enabled) {
        const price = stock.regularMarketPrice || 0;
        if (price < priceFilter.min || price > priceFilter.max) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price': return (b.regularMarketPrice || 0) - (a.regularMarketPrice || 0);
        case 'change': return (b.regularMarketChange || 0) - (a.regularMarketChange || 0);
        case 'rsi': return (b.indicators?.rsi || 0) - (a.indicators?.rsi || 0);
        default: return a.symbol.localeCompare(b.symbol);
      }
    });

  useEffect(() => {
    const fetchStocks = async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      
      try {
        const data = await api.getStockData();
        setStocks(data.quotes || []);
        setStats({
          totalIDX: data.totalIDX || 0,
          totalActive: data.totalActive || 0,
          totalQuotes: data.totalQuotes || 0
        });
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Failed to fetch stocks:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchStocks();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStocks(true), 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Data Saham IDX
        </h1>
        <div className="flex items-center gap-4">
          {refreshing && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm">Updating...</span>
            </div>
          )}
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total IDX</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalIDX}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Saham Aktif</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalActive}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Data Tersedia</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalQuotes}</p>
        </div>
      </div>

      {/* Volume Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Volume Stocks
          </h3>
          <div className="space-y-2">
            {stocks
              .sort((a, b) => (b.regularMarketVolume || 0) - (a.regularMarketVolume || 0))
              .slice(0, 5)
              .map((stock) => (
                console.log(stock),
                
                <div key={stock.symbol} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stock.symbol.replace('.JK', '')}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(stock.regularMarketVolume || 0).toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trading Signals Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">BUY Signals</span>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                {stocks.filter(s => s.signal === 'BUY').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">SELL Signals</span>
              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                {stocks.filter(s => s.signal === 'SELL').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">HOLD Signals</span>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                {stocks.filter(s => s.signal === 'HOLD').length}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Row 1: Signal and Sort */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                Signal:
              </label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value as 'ALL' | 'BUY' | 'SELL' | 'HOLD')}
                className="border border-gray-300 rounded px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="ALL">All Signals</option>
                <option value="BUY">BUY Only</option>
                <option value="SELL">SELL Only</option>
                <option value="HOLD">HOLD Only</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                Sort by:
              </label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'symbol' | 'price' | 'change' | 'rsi')}
                className="border border-gray-300 rounded px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="symbol">Symbol</option>
                <option value="price">Price</option>
                <option value="change">Change</option>
                <option value="rsi">RSI</option>
              </select>
            </div>
          </div>
          
          {/* Row 2: Price Filter */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={priceFilter.enabled}
                onChange={(e) => setPriceFilter({...priceFilter, enabled: e.target.checked})}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                Price Filter:
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceFilter.min}
                onChange={(e) => setPriceFilter({...priceFilter, min: parseInt(e.target.value) || 0})}
                disabled={!priceFilter.enabled}
                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50"
              />
              <span className="text-sm text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceFilter.max}
                onChange={(e) => setPriceFilter({...priceFilter, max: parseInt(e.target.value) || 100})}
                disabled={!priceFilter.enabled}
                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50"
              />
              <button
                onClick={() => setPriceFilter({min: 0, max: 100000, enabled: false})}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Show All
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredStocks.length} of {stocks.length} stocks
          {priceFilter.enabled && (
            <span className="ml-2">
              (Price: Rp {priceFilter.min.toLocaleString()} - Rp {priceFilter.max.toLocaleString()})
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Simbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Nama
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Harga
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Perubahan
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  RSI
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Signal
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Strength
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredStocks.map((stock) => (
                <tr key={stock.symbol}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {stock.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {stock.shortName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                    {stock.regularMarketPrice?.toLocaleString() || "-"}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                    stock.regularMarketChange > 0 ? 'text-green-600' : 
                    stock.regularMarketChange < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {stock.regularMarketChange > 0 ? '+' : ''}
                    {stock.regularMarketChange?.toFixed(2) || "-"} 
                    ({stock.regularMarketChangePercent?.toFixed(2) || "-"}%)
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${
                    !stock.indicators?.rsi ? 'text-gray-400' :
                    stock.indicators.rsi > 70 ? 'text-red-600' :
                    stock.indicators.rsi < 30 ? 'text-green-600' : 'text-gray-900 dark:text-white'
                  }`}>
                    {stock.indicators?.rsi?.toFixed(1) || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      stock.signal === 'STRONG_BUY' ? 'bg-green-200 text-green-900 font-bold' :
                      stock.signal === 'BUY' ? 'bg-green-100 text-green-800' :
                      stock.signal === 'STRONG_SELL' ? 'bg-red-200 text-red-900 font-bold' :
                      stock.signal === 'SELL' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {stock.signal || 'HOLD'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded ${
                      (stock.signalStrength || 0) > 2 ? 'bg-green-500 text-white' :
                      (stock.signalStrength || 0) > 0 ? 'bg-green-200 text-green-800' :
                      (stock.signalStrength || 0) < -2 ? 'bg-red-500 text-white' :
                      (stock.signalStrength || 0) < 0 ? 'bg-red-200 text-red-800' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {stock.signalStrength || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}