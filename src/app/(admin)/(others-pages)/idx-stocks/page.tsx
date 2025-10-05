"use client";
import { useEffect, useState } from "react";

interface IDXStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  signal: string;
  signalStrength: number;
  indicators: {
    rsi: number | null;
    sma10: number | null;
    ema5: number | null;
  };
  marketDepth: {
    bid: number;
    ask: number;
    spread: number;
  };
  foreignActivity: {
    netBuy: number;
    dominance: number;
  };
}

// Sector mapping untuk filter
const sectorMapping: Record<string, string> = {
  'BBCA': 'Banking', 'BBRI': 'Banking', 'BMRI': 'Banking', 'BBNI': 'Banking',
  'TLKM': 'Telecom', 'ISAT': 'Telecom', 'EXCL': 'Telecom',
  'ASII': 'Automotive', 'AUTO': 'Automotive',
  'UNVR': 'Consumer', 'INDF': 'Consumer', 'ICBP': 'Consumer', 'KLBF': 'Consumer',
  'SMGR': 'Cement', 'INTP': 'Cement', 'WTON': 'Cement',
  'PGAS': 'Energy', 'ADRO': 'Mining', 'PTBA': 'Mining', 'ITMG': 'Mining',
  'GGRM': 'Tobacco', 'HMSP': 'Tobacco',
  'BSDE': 'Property', 'CTRA': 'Property', 'LPKR': 'Property'
};

function getSector(symbol: string): string {
  const baseSymbol = symbol.replace('.JK', '');
  if (sectorMapping[baseSymbol]) return sectorMapping[baseSymbol];
  if (baseSymbol.startsWith('B') && baseSymbol.length === 4) return 'Banking';
  if (baseSymbol.startsWith('T') && baseSymbol.length === 4) return 'Telecom';
  return 'Others';
}

export default function IDXStocksPage() {
  const [stocks, setStocks] = useState<IDXStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalStocks: 0, 
    activeStocks: 0, 
    processedStocks: 0, 
    displayedStocks: 0 
  });
  const [signalSummary, setSignalSummary] = useState({
    buy: 0,
    sell: 0,
    hold: 0,
    strongBuy: 0,
    strongSell: 0
  });
  const [priceFilter, setPriceFilter] = useState({ min: 50, max: 100, enabled: true });
  const [signalFilter, setSignalFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'HOLD'>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [sectorAnalysis, setSectorAnalysis] = useState<Record<string, {
    count: number;
    avgSignalStrength: number;
    buySignals: number;
    sellSignals: number;
    topPerformer: string;
  }>>({});
  
  // Get unique sectors from stocks
  const availableSectors = ['ALL', ...Array.from(new Set(stocks.map(stock => getSector(stock.symbol))))];
  
  const filteredStocks = stocks.filter(stock => {
    // Price filter
    if (priceFilter.enabled) {
      if (stock.price < priceFilter.min || stock.price > priceFilter.max) return false;
    }
    
    // Signal filter
    if (signalFilter !== 'ALL') {
      const stockSignal = stock.signal.includes('BUY') ? 'BUY' : 
                         stock.signal.includes('SELL') ? 'SELL' : 'HOLD';
      if (stockSignal !== signalFilter) return false;
    }
    
    // Sector filter
    if (sectorFilter !== 'ALL') {
      const stockSector = getSector(stock.symbol);
      if (stockSector !== sectorFilter) return false;
    }
    
    return true;
  });

  useEffect(() => {
    const fetchIDXData = async () => {
      try {
        const response = await fetch("/api/idx");
        const data = await response.json();
        console.log("IDX Data:", data.data);
        
        setStocks(data.stocks || []);
        setStats({
          totalStocks: data.totalStocks || 0,
          activeStocks: data.activeStocks || 0,
          processedStocks: data.processedStocks || 0,
          displayedStocks: data.displayedStocks || 0
        });
        setSignalSummary(data.signalSummary || {
          buy: 0, sell: 0, hold: 0, strongBuy: 0, strongSell: 0
        });
        setSectorAnalysis(data.sectorAnalysis || {});
      } catch (error) {
        console.error("Failed to fetch IDX data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIDXData();
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        IDX Stocks Analysis
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Stocks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalStocks}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Stocks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeStocks}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Processed</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.processedStocks}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Displayed</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.displayedStocks}</p>
        </div>
      </div>

      {/* Signal Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trading Signals Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">BUY Signals</span>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                {signalSummary.buy}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">SELL Signals</span>
              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                {signalSummary.sell}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">HOLD Signals</span>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                {signalSummary.hold}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Strong Signals
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">STRONG BUY</span>
              <span className="px-2 py-1 text-xs bg-green-200 text-green-900 rounded-full font-bold">
                {signalSummary.strongBuy}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">STRONG SELL</span>
              <span className="px-2 py-1 text-xs bg-red-200 text-red-900 rounded-full font-bold">
                {signalSummary.strongSell}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Signals</span>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {signalSummary.buy + signalSummary.sell + signalSummary.hold}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Volume Stocks
          </h3>
          <div className="space-y-2">
            {stocks
              .sort((a, b) => b.volume - a.volume)
              .slice(0, 5)
              .map((stock, index) => (
                <div key={stock.symbol} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {stock.symbol}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {(stock.volume / 1000000).toFixed(1)}M
                    </div>
                    <div className={`text-xs ${
                      stock.changePercent > 0 ? 'text-green-600' : 
                      stock.changePercent < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Sector Analysis */}
      {Object.keys(sectorAnalysis).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sector Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(sectorAnalysis)
              .sort(([,a], [,b]) => b.count - a.count)
              .slice(0, 6)
              .map(([sector, data]) => (
                <div 
                  key={sector} 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    sectorFilter === sector 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setSectorFilter(sectorFilter === sector ? 'ALL' : sector)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{sector}</h4>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {data.count} stocks
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Avg Signal:</span>
                      <span className={`font-medium ${
                        data.avgSignalStrength > 1 ? 'text-green-600' :
                        data.avgSignalStrength < -1 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {data.avgSignalStrength?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">BUY/SELL:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {data.buySignals || 0}/{data.sellSignals || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Top:</span>
                      <span className="font-medium text-blue-600 text-xs">
                        {data.topPerformer || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            💡 Click on a sector card to filter stocks by that sector
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Signal Filter */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                Signal:
              </label>
              <select 
                value={signalFilter} 
                onChange={(e) => setSignalFilter(e.target.value as 'ALL' | 'BUY' | 'SELL' | 'HOLD')}
                className="border border-gray-300 rounded px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="ALL">All Signals</option>
                <option value="BUY">BUY Only</option>
                <option value="SELL">SELL Only</option>
                <option value="HOLD">HOLD Only</option>
              </select>
            </div>
          </div>
          
          {/* Sector Filter */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                Sector:
              </label>
              <select 
                value={sectorFilter} 
                onChange={(e) => setSectorFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {availableSectors.map(sector => (
                  <option key={sector} value={sector}>
                    {sector === 'ALL' ? 'All Sectors' : sector}
                    {sector !== 'ALL' && sectorAnalysis[sector] && (
                      ` (${sectorAnalysis[sector].count || 0})`
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Price Filter */}
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
          {sectorFilter !== 'ALL' && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              Sector: {sectorFilter}
            </span>
          )}
          {signalFilter !== 'ALL' && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
              Signal: {signalFilter}
            </span>
          )}
          {priceFilter.enabled && (
            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
              Price: Rp {priceFilter.min.toLocaleString()} - Rp {priceFilter.max.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sector</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Change</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">RSI</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Signal</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Strength</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredStocks.map((stock, index) => (
                <tr key={stock.symbol}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {stock.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {stock.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {getSector(stock.symbol)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                    {stock.price.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                    stock.change > 0 ? 'text-green-600' : 
                    stock.change < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} 
                    ({stock.changePercent.toFixed(2)}%)
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
                      {stock.signal}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded ${
                      stock.signalStrength > 2 ? 'bg-green-500 text-white' :
                      stock.signalStrength > 0 ? 'bg-green-200 text-green-800' :
                      stock.signalStrength < -2 ? 'bg-red-500 text-white' :
                      stock.signalStrength < 0 ? 'bg-red-200 text-red-800' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {stock.signalStrength}
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