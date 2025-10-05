"use client";
import { useEffect, useState } from "react";

interface BandarStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bandarSignal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  bandarConfidence: number;
  bandarPattern: string;
  signal: string;
  signalStrength: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  dayTradePotential: {
    targetPrice: number;
    stopLoss: number;
    riskReward: string;
    positionSize: string;
  };
}

export default function BandarScannerPage() {
  const [stocks, setStocks] = useState<BandarStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    accumulation: false,
    highConfidence: false,
    lowRisk: false,
    highVolume: false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/bandar-scanner");
        const data = await response.json();
        setStocks(data.stocks || []);
      } catch (error) {
        console.error("Failed to fetch bandar data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredStocks = stocks.filter(stock => {
    if (filter.accumulation && stock.bandarSignal !== 'ACCUMULATION') return false;
    if (filter.highConfidence && stock.bandarConfidence < 4) return false;
    if (filter.lowRisk && stock.riskLevel !== 'LOW') return false;
    if (filter.highVolume && stock.volume < 2000000) return false;
    return true;
  });

  const stats = {
    accumulation: stocks.filter(s => s.bandarSignal === 'ACCUMULATION').length,
    distribution: stocks.filter(s => s.bandarSignal === 'DISTRIBUTION').length,
    strongBuy: stocks.filter(s => s.signal === 'STRONG_BUY').length,
    highConfidence: stocks.filter(s => s.bandarConfidence >= 4).length
  };

  if (loading) {
    return <div className="p-6">Loading bandar scanner...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          🎯 BANDAR SCANNER - Zona 50-100
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          🕐 Last Update: {new Date().toLocaleTimeString()} | 📈 Market: CLOSED
        </p>
        <p className="text-sm text-blue-600">
          📊 {stats.accumulation} Accumulation Signals | ⚠️ {stats.distribution} Distribution Warnings
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-green-600 font-bold text-lg">{stats.accumulation}</div>
          <div className="text-sm text-green-700 dark:text-green-400">ACCUMULATION 📈</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="text-red-600 font-bold text-lg">{stats.distribution}</div>
          <div className="text-sm text-red-700 dark:text-red-400">DISTRIBUTION 📉</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-blue-600 font-bold text-lg">{stats.strongBuy}</div>
          <div className="text-sm text-blue-700 dark:text-blue-400">STRONG BUY 🚀</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <div className="text-yellow-600 font-bold text-lg">{stats.highConfidence}</div>
          <div className="text-sm text-yellow-700 dark:text-yellow-400">HIGH CONFIDENCE ⭐</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-3">Quick Filters</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filter.accumulation}
              onChange={(e) => setFilter({...filter, accumulation: e.target.checked})}
              className="mr-2"
            />
            Accumulation Only
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filter.highConfidence}
              onChange={(e) => setFilter({...filter, highConfidence: e.target.checked})}
              className="mr-2"
            />
            Confidence ≥ 4
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filter.lowRisk}
              onChange={(e) => setFilter({...filter, lowRisk: e.target.checked})}
              className="mr-2"
            />
            Risk: LOW only
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filter.highVolume}
              onChange={(e) => setFilter({...filter, highVolume: e.target.checked})}
              className="mr-2"
            />
            Volume > 2M
          </label>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bandar Signal</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Confidence</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Day Trade</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredStocks.map((stock) => (
                <tr key={stock.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{stock.symbol}</div>
                      <div className="text-sm text-gray-500">{stock.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-gray-900 dark:text-white">Rp {stock.price}</div>
                    <div className={`text-sm ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-900 dark:text-white">
                    {(stock.volume / 1000000).toFixed(1)}M
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      stock.bandarSignal === 'ACCUMULATION' ? 'bg-green-100 text-green-800' :
                      stock.bandarSignal === 'DISTRIBUTION' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {stock.bandarSignal === 'ACCUMULATION' ? '🚀' : 
                       stock.bandarSignal === 'DISTRIBUTION' ? '📉' : '⏸️'} {stock.bandarSignal}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="font-bold text-lg">{stock.bandarConfidence}/5</div>
                  </td>
                  <td className="px-4 py-4 text-center text-sm">
                    <div>🎯 {stock.dayTradePotential.targetPrice}</div>
                    <div>🛑 {stock.dayTradePotential.stopLoss}</div>
                    <div className="text-xs text-gray-500">{stock.dayTradePotential.positionSize}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                      View Plan
                    </button>
                  </td> 
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredStocks.length} of {stocks.length} stocks
      </div>
    </div>
  );
}