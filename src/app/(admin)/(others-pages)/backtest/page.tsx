"use client";
import { useState } from "react";

interface BacktestResult {
  symbol: string;
  strategy: string;
  period: string;
  initialCapital: number;
  finalValue: number;
  totalReturn: string;
  buyHoldReturn: string;
  tradesCount: number;
  winRate: string;
  performance: {
    alpha: string;
    maxDrawdown: string;
  };
  trades: Array<{
    date: string;
    type: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    signal: string;
  }>;
}

export default function BacktestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [params, setParams] = useState({
    symbol: 'BBCA.JK',
    days: 90,
    strategy: 'rsi' as 'rsi' | 'ma_cross' | 'combined',
    initialCapital: 100000000
  });

  const runBacktest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Backtest failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Strategy Backtesting
      </h1>

      {/* Parameters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Backtest Parameters
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stock Symbol
            </label>
            <input
              type="text"
              value={params.symbol}
              onChange={(e) => setParams({...params, symbol: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="BBCA.JK"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period (Days)
            </label>
            <select
              value={params.days}
              onChange={(e) => setParams({...params, days: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={180}>180 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Strategy
            </label>
            <select
              value={params.strategy}
              onChange={(e) => setParams({...params, strategy: e.target.value as 'rsi' | 'ma_cross' | 'combined'})}
              className="w-full border border-gray-300 rounded px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="rsi">RSI Strategy</option>
              <option value="ma_cross">MA Crossover</option>
              <option value="combined">Combined Strategy</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Initial Capital (Rp)
            </label>
            <input
              type="number"
              value={params.initialCapital}
              onChange={(e) => setParams({...params, initialCapital: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        
        <button
          onClick={runBacktest}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Running Backtest...' : 'Run Backtest'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Return</p>
              <p className={`text-2xl font-bold ${parseFloat(result.totalReturn) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.totalReturn}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Buy & Hold</p>
              <p className={`text-2xl font-bold ${parseFloat(result.buyHoldReturn) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.buyHoldReturn}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.winRate}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Alpha</p>
              <p className={`text-2xl font-bold ${parseFloat(result.performance.alpha) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.performance.alpha}%
              </p>
            </div>
          </div>

          {/* Trade History */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Trade History ({result.trades.length} trades)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Action
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Signal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {result.trades.map((trade, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {trade.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          trade.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {trade.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {trade.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {trade.signal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}