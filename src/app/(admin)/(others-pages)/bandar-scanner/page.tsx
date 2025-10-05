"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

// Custom styles for smooth scrolling
const modalScrollStyles = {
  scrollBehavior: 'smooth' as const,
  WebkitOverflowScrolling: 'touch' as const,
};

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
  volatility?: number;
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

  const [selectedStock, setSelectedStock] = useState<BandarStock | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const openPlan = (stock: BandarStock) => {
    setSelectedStock(stock);
    openModal();
  };

  const closePlan = () => {
    closeModal();
    setSelectedStock(null);
  };

  // Check if market is open (09:00-15:30 WIB)
  const isMarketOpen = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 100 + minutes;
    
    // Market hours: 09:00-15:30 WIB (Monday-Friday)
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMarketHours = currentTime >= 900 && currentTime <= 1530;
    
    return isWeekday && isMarketHours;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bandar-scanner");
      const data = await response.json();
      setStocks(data.stocks || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch bandar data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Smart polling with market hours detection
  useEffect(() => {
    if (!autoRefresh) return;

    const marketOpen = isMarketOpen();
    const interval = marketOpen ? 30000 : 300000; // 30s vs 5min
    
    const timer = setInterval(() => {
      // Only refresh if tab is visible
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [autoRefresh]);

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
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            🕐 Last Update: {lastUpdate?.toLocaleTimeString() || 'Loading...'} | 
            📈 Market: {isMarketOpen() ? 'OPEN' : 'CLOSED'}
          </p>
          <div className="flex items-center gap-4">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              Auto Refresh ({isMarketOpen() ? '30s' : '5min'})
            </label>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
        </div>
        <p className="text-sm text-blue-600">
          📊 {stats.accumulation} Accumulation Signals | ⚠️ {stats.distribution} Distribution Warnings
        </p>
      </div>

      {/* Penjelasan */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 Cara Menggunakan Bandar Scanner</h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p><strong>🎯 Strategi:</strong> Day trading saham zona Rp 50-100 dengan deteksi pola bandar accumulation</p>
          <p><strong>🚀 ACCUMULATION:</strong> Bandar sedang mengumpulkan saham (volume tinggi, harga stabil) - Sinyal BUY</p>
          <p><strong>📉 DISTRIBUTION:</strong> Bandar sedang melepas saham (volume tinggi, harga turun) - Sinyal SELL</p>
          <p><strong>⭐ Confidence:</strong> Tingkat keyakinan pola bandar (1-5, semakin tinggi semakin kuat)</p>
          <p><strong>🎯 Day Trade Plan:</strong> Target profit 4-6%, Stop loss 2-3%, Hold maksimal 1 hari</p>
        </div>
      </div>

      {/* Trading Rules */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">⚡ Day Trading Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800 dark:text-yellow-200">
          <div>
            <p><strong>✅ Entry Criteria:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Harga: Rp 50-100 (zona aman)</li>
              <li>Volume: {'>'} 1 juta (likuiditas)</li>
              <li>Bandar: ACCUMULATION</li>
              <li>Confidence: {'>='} 4/5</li>
            </ul>
          </div>
          <div>
            <p><strong>🎯 Exit Strategy:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Profit 4-6% - TAKE PROFIT</li>
              <li>EOD (End of Day) - CLOSE</li>
              <li>Stop loss hit - CUT LOSS</li>
              <li>No momentum - EXIT</li>
            </ul>
          </div>
        </div>
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
            Confidence {'>='} 4
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
            Volume {'>'} 2M
          </label>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">No</th>
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
              {filteredStocks.map((stock, index) => (
                <tr key={stock.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                    {index + 1}
                  </td>
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
                    <button 
                      onClick={() => openPlan(stock)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
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

      {/* Footer Info */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💡 Tips Trading</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>• Fokus pada saham dengan confidence {'>='} 4 dan risk level LOW</p>
          <p>• Gunakan position size 3-5% dari total capital untuk manage risk</p>
          <p>• Selalu set stop loss sebelum entry, disiplin cut loss jika hit</p>
          <p>• Take profit bertahap: 50% di target pertama, 50% di target kedua</p>
          <p>• Jangan hold overnight, close semua posisi sebelum market tutup</p>
        </div>
      </div>

      {/* Trading Plan Modal */}
      <Modal isOpen={isOpen} onClose={closePlan} className="max-w-2xl max-h-[90vh] overflow-hidden">
        {selectedStock && (
          <div 
            className="max-h-[90vh] overflow-y-auto" 
            style={modalScrollStyles}
          >
            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  📋 Trading Plan: {selectedStock.symbol}
                </h2>
              </div>

              <div className="space-y-4">
                {/* Stock Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{selectedStock.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-gray-700 dark:text-gray-300">Current Price: <span className="font-bold text-gray-900 dark:text-white">Rp {selectedStock.price}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Volume: <span className="font-bold text-gray-900 dark:text-white">{(selectedStock.volume / 1000000).toFixed(1)}M</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Signal: <span className={`font-bold ${
                      selectedStock.bandarSignal === 'ACCUMULATION' ? 'text-green-600' : 'text-red-600'
                    }`}>{selectedStock.bandarSignal}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Confidence: <span className="font-bold text-gray-900 dark:text-white">{selectedStock.bandarConfidence}/5</span></div>
                  </div>
                </div>

                {/* Entry Strategy */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-green-600 mb-3">🎯 Entry Strategy</h4>
                  <div className="space-y-2 text-sm">
                    <div className="text-gray-700 dark:text-gray-300">Entry Price: <span className="font-bold text-green-600">Rp {selectedStock.price}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Position Size: <span className="font-bold text-gray-900 dark:text-white">{selectedStock.dayTradePotential.positionSize}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Max Capital: <span className="font-bold text-gray-900 dark:text-white">5% dari total portfolio</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Best Entry Time: <span className="font-bold text-gray-900 dark:text-white">09:30 - 10:30 WIB</span></div>
                  </div>
                </div>

                {/* Exit Strategy */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-600 mb-3">🚀 Exit Strategy</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-green-600 mb-2">Take Profit</div>
                      <div className="text-gray-700 dark:text-gray-300">Target 1: <span className="font-bold text-gray-900 dark:text-white">{selectedStock.dayTradePotential.targetPrice}</span></div>
                      <div className="text-gray-700 dark:text-gray-300">Target 2: <span className="font-bold text-gray-900 dark:text-white">Rp {(parseFloat(selectedStock.price.toString()) * 1.06).toFixed(0)}</span></div>
                    </div>
                    <div>
                      <div className="font-semibold text-red-600 mb-2">Stop Loss</div>
                      <div className="text-gray-700 dark:text-gray-300">SL Level: <span className="font-bold text-gray-900 dark:text-white">{selectedStock.dayTradePotential.stopLoss}</span></div>
                      <div className="text-gray-700 dark:text-gray-300">Max Loss: <span className="font-bold text-red-600">-3%</span></div>
                    </div>
                  </div>
                </div>

                {/* Risk Analysis */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-600 mb-3">⚠️ Risk Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="text-gray-700 dark:text-gray-300">Risk Level: <span className={`font-bold ${
                      selectedStock.riskLevel === 'LOW' ? 'text-green-600' : 
                      selectedStock.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                    }`}>{selectedStock.riskLevel}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">R:R Ratio: <span className="font-bold text-green-600">1:2</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Volatility: <span className="font-bold text-gray-900 dark:text-white">{selectedStock.volatility || 15}%</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Liquidity: <span className="font-bold text-green-600">HIGH</span></div>
                  </div>
                </div>

                {/* Trading Rules */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3">📋 Trading Rules</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>✅ Entry hanya jika volume {'>'} 1M dan confidence {'>='} 4</li>
                    <li>✅ Set stop loss SEBELUM entry</li>
                    <li>✅ Take profit bertahap: 50% di target 1, 50% di target 2</li>
                    <li>✅ Close semua posisi sebelum jam 15:45 WIB</li>
                    <li>❌ Jangan averaging down jika loss</li>
                    <li>❌ Jangan hold overnight</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors">
                    🚀 Execute Plan
                  </button>
                  <button 
                    onClick={closePlan}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}