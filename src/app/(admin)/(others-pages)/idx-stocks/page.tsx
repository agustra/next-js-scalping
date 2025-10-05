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

export default function IDXStocksPage() {
  const [stocks, setStocks] = useState<IDXStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalStocks: 0, activeStocks: 0, processedStocks: 0 });

  useEffect(() => {
    const fetchIDXData = async () => {
      try {
        const response = await fetch("/api/idx");
        const data = await response.json();
        setStocks(data.stocks || []);
        setStats({
          totalStocks: data.totalStocks || 0,
          activeStocks: data.activeStocks || 0,
          processedStocks: data.processedStocks || 0
        });
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Change</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">RSI</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Signal</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Strength</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {stocks.map((stock) => (
                <tr key={stock.symbol}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {stock.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {stock.name}
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