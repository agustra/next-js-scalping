import { NextResponse } from "next/server";
import { RSI, SMA, EMA, MACD, BollingerBands, Stochastic } from 'technicalindicators';

interface IDXStockData {
  No: number;
  IDStockSummary: number;
  Date: string;
  StockCode: string;
  StockName: string;
  Remarks: string;
  Previous: number;
  OpenPrice: number;
  FirstTrade: number;
  High: number;
  Low: number;
  Close: number;
  Change: number;
  Volume: number;
  Value: number;
  Frequency: number;
  IndexIndividual: number;
  Offer: number;
  OfferVolume: number;
  Bid: number;
  BidVolume: number;
  ListedShares: number;
  TradebleShares: number;
  WeightForIndex: number;
  ForeignSell: number;
  ForeignBuy: number;
  DelistingDate: string;
  NonRegularVolume: number;
  NonRegularValue: number;
  NonRegularFrequency: number;
  persen: number | null;
  percentage: number | null;
}

interface EnhancedStockResult {
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
    macd: { MACD: number | null; signal: number | null; histogram: number | null };
    bb: { upper: number | null; middle: number | null; lower: number | null };
    stoch: { k: number | null; d: number | null };
  };
  marketDepth: {
    bid: number;
    bidVolume: number;
    ask: number;
    askVolume: number;
    spread: number;
    spreadPercent: number;
  };
  foreignActivity: {
    netBuy: number;
    buyVolume: number;
    sellVolume: number;
    dominance: number;
  };
  riskMetrics: {
    support: number;
    resistance: number;
    atr: number;
    volatility: number;
    riskRewardRatio: number;
  };
}

interface CachedData {
  source: string;
  timestamp: number;
  data: EnhancedStockResult[];
}

// Memory cache
const memoryCache = new Map<string, { data: CachedData; timestamp: number }>();

export async function GET() {
  try {
    // Cache management
    const cacheKey = getCacheKey();
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('📦 Serving from cache');
      return NextResponse.json({
        ...cachedData,
        source: cachedData.source + ' (Cached)',
        cached: true,
        cacheTime: new Date(cachedData.timestamp).toISOString()
      });
    }
    
    console.log('🔄 Fetching fresh data from IDX...');
    
    // 1. Ambil data saham dari IDX
    const idxResponse = await fetch(
      "https://www.idx.co.id/primary/TradingSummary/GetStockSummary",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
        },
        next: { revalidate: 60 } // Revalidate every 60 seconds
      }
    );

    if (!idxResponse.ok) {
      throw new Error(`Failed to fetch IDX data: ${idxResponse.status}`);
    }

    const idxData = await idxResponse.json();

    if (!idxData?.data || !Array.isArray(idxData.data)) {
      throw new Error("Invalid IDX data structure");
    }

    // 2. Filter dan proses saham aktif
    const activeStocks = idxData.data.filter((stock: IDXStockData) => {
      return (
        stock.Volume > 100000 && // Minimum volume 100k
        stock.Close > 50 && // Minimum price Rp 50
        stock.StockCode && // Valid stock code
        stock.Close > 0 // Positive price
      );
    });

    console.log(`📊 Processing ${activeStocks.length} active stocks`);

    // 3. Process stocks dengan technical indicators
    const processedStocks = await processStocksWithIndicators(activeStocks);

    // 4. Sort by signal strength
    const sortedStocks = processedStocks.sort((a, b) => {
      // Primary: Absolute signal strength
      if (Math.abs(b.signalStrength) !== Math.abs(a.signalStrength)) {
        return Math.abs(b.signalStrength) - Math.abs(a.signalStrength);
      }
      // Secondary: Volume untuk likuiditas
      return b.volume - a.volume;
    });

    // 5. Prepare response
    const responseData = {
      source: "IDX Complete Data + Technical Analysis",
      timestamp: Date.now(),
      totalStocks: idxData.data.length,
      activeStocks: activeStocks.length,
      processedStocks: sortedStocks.length,
      marketSummary: getMarketSummary(idxData.data),
      stocks: sortedStocks.slice(0, 100), // Top 100 signals
      cached: false
    };

    // 6. Cache the result
    setCachedData(cacheKey, responseData);
    console.log('💾 Data cached successfully');

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("IDX API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process IDX data",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

async function processStocksWithIndicators(stocks: IDXStockData[]): Promise<EnhancedStockResult[]> {
  const results: EnhancedStockResult[] = [];
  
  // Process in batches to avoid overwhelming
  const batchSize = 20;
  
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (stock) => {
        try {
          return await processSingleStock(stock);
        } catch (error) {
          console.error(`Failed to process ${stock.StockCode}:`, error);
          return null;
        }
      })
    );
    
    results.push(...batchResults.filter(Boolean) as EnhancedStockResult[]);
    
    // Add delay between batches
    if (i + batchSize < stocks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

async function processSingleStock(stock: IDXStockData): Promise<EnhancedStockResult> {
  // Simulate historical data from current day data (for demo)
  // In real implementation, you'd fetch historical data from IDX
  const historicalData = simulateHistoricalData(stock);
  
  const closes = historicalData.map(h => h.close);
  const highs = historicalData.map(h => h.high);
  const lows = historicalData.map(h => h.low);
  
  // Calculate technical indicators
  const rsi = RSI.calculate({ values: closes, period: 9 });
  const sma10 = SMA.calculate({ values: closes, period: 10 });
  const ema5 = EMA.calculate({ values: closes, period: 5 });
  const macd = MACD.calculate({ 
    values: closes, 
    fastPeriod: 5, 
    slowPeriod: 13, 
    signalPeriod: 4,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const bb = BollingerBands.calculate({ 
    values: closes, 
    period: 10, 
    stdDev: 1.5 
  });
  const stoch = Stochastic.calculate({
    high: highs,
    low: lows, 
    close: closes,
    period: 5,
    signalPeriod: 2
  });
  
  const currentPrice = stock.Close;
  const currentVolume = stock.Volume;
  
  // Get latest indicator values
  const currentRSI = rsi.length > 0 ? rsi[rsi.length - 1] : null;
  const currentSMA = sma10.length > 0 ? sma10[sma10.length - 1] : null;
  const currentEMA = ema5.length > 0 ? ema5[ema5.length - 1] : null;
  const currentMACD = macd.length > 0 ? macd[macd.length - 1] : null;
  const currentBB = bb.length > 0 ? bb[bb.length - 1] : null;
  const currentStoch = stoch.length > 0 ? stoch[stoch.length - 1] : null;
  
  // Calculate risk metrics
  const riskMetrics = calculateRiskMetrics(historicalData, currentPrice);
  
  // Generate trading signal
  const signal = generateTradingSignal({
    price: currentPrice,
    rsi: currentRSI,
    sma: currentSMA,
    ema: currentEMA,
    volume: currentVolume,
    foreignNet: stock.ForeignBuy - stock.ForeignSell,
    bidAskSpread: stock.Offer - stock.Bid
  });
  
  const signalStrength = calculateSignalStrength({
    rsi: currentRSI,
    sma: currentSMA,
    ema: currentEMA,
    price: currentPrice,
    volume: currentVolume,
    foreignNet: stock.ForeignBuy - stock.ForeignSell
  });
  
  return {
    symbol: stock.StockCode,
    name: stock.StockName,
    price: currentPrice,
    change: stock.Change,
    changePercent: stock.Previous > 0 ? (stock.Change / stock.Previous) * 100 : 0,
    volume: currentVolume,
    signal,
    signalStrength,
    indicators: {
      rsi: currentRSI,
      sma10: currentSMA,
      ema5: currentEMA,
      macd: {
        MACD: currentMACD?.MACD ?? null,
        signal: currentMACD?.signal ?? null,
        histogram: currentMACD?.histogram ?? null
      },
      bb: {
        upper: currentBB?.upper ?? null,
        middle: currentBB?.middle ?? null,
        lower: currentBB?.lower ?? null
      },
      stoch: {
        k: currentStoch?.k ?? null,
        d: currentStoch?.d ?? null
      }
    },
    marketDepth: {
      bid: stock.Bid,
      bidVolume: stock.BidVolume,
      ask: stock.Offer,
      askVolume: stock.OfferVolume,
      spread: stock.Offer - stock.Bid,
      spreadPercent: stock.Bid > 0 ? ((stock.Offer - stock.Bid) / stock.Bid) * 100 : 0
    },
    foreignActivity: {
      netBuy: stock.ForeignBuy - stock.ForeignSell,
      buyVolume: stock.ForeignBuy,
      sellVolume: stock.ForeignSell,
      dominance: currentVolume > 0 ? 
        ((stock.ForeignBuy + stock.ForeignSell) / currentVolume) * 100 : 0
    },
    riskMetrics
  };
}

function simulateHistoricalData(stock: IDXStockData): Array<{close: number; high: number; low: number}> {
  // Simulate 30 days of historical data based on current price and volatility
  // In production, replace with actual IDX historical data API call
  const historical = [];
  const basePrice = stock.Previous;
  const volatility = Math.abs(stock.Change) / basePrice;
  
  for (let i = 30; i > 0; i--) {
    const randomFactor = 1 + (Math.random() - 0.5) * volatility * 2;
    const simulatedClose = basePrice * randomFactor;
    const simulatedHigh = simulatedClose * (1 + Math.random() * 0.03);
    const simulatedLow = simulatedClose * (1 - Math.random() * 0.03);
    
    historical.push({
      close: simulatedClose,
      high: simulatedHigh,
      low: simulatedLow
    });
  }
  
  // Add actual current day data
  historical.push({
    close: stock.Close,
    high: stock.High,
    low: stock.Low
  });
  
  return historical;
}

function generateTradingSignal(params: {
  price: number;
  rsi: number | null;
  sma: number | null;
  ema: number | null;
  volume: number;
  foreignNet: number;
  bidAskSpread: number;
}): string {
  const { price, rsi, sma, ema, volume, foreignNet, bidAskSpread } = params;
  
  if (!rsi || !sma || !ema) return 'HOLD';
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // RSI Signals
  if (rsi < 25) bullishSignals += 3;
  else if (rsi < 35) bullishSignals += 2;
  else if (rsi < 45) bullishSignals += 1;
  else if (rsi > 75) bearishSignals += 3;
  else if (rsi > 65) bearishSignals += 2;
  else if (rsi > 55) bearishSignals += 1;
  
  // Moving Average Signals
  const emaAboveSma = ema > sma;
  const priceAboveSma = price > sma;
  
  if (emaAboveSma && priceAboveSma) bullishSignals += 2;
  else if (emaAboveSma) bullishSignals += 1;
  else if (!emaAboveSma && !priceAboveSma) bearishSignals += 2;
  else if (!emaAboveSma) bearishSignals += 1;
  
  // Volume Confirmation
  if (volume > 1000000) bullishSignals += 1;
  else if (volume < 100000) bearishSignals += 1;
  
  // Foreign Activity
  if (foreignNet > 1000000) bullishSignals += 1;
  else if (foreignNet < -1000000) bearishSignals += 1;
  
  // Bid-Ask Spread (tight spread is better)
  if (bidAskSpread / price < 0.01) bullishSignals += 1;
  else if (bidAskSpread / price > 0.03) bearishSignals += 1;
  
  const netSignals = bullishSignals - bearishSignals;
  
  if (netSignals >= 4) return 'STRONG_BUY';
  if (netSignals >= 2) return 'BUY';
  if (netSignals <= -4) return 'STRONG_SELL';
  if (netSignals <= -2) return 'SELL';
  
  return 'HOLD';
}

function calculateSignalStrength(params: {
  rsi: number | null;
  sma: number | null;
  ema: number | null;
  price: number;
  volume: number;
  foreignNet: number;
}): number {
  const { rsi, sma, ema, price, volume, foreignNet } = params;
  
  if (!rsi || !sma || !ema) return 0;
  
  let strength = 0;
  
  // RSI Strength
  if (rsi < 25) strength += 3;
  else if (rsi < 35) strength += 2;
  else if (rsi < 45) strength += 1;
  else if (rsi > 75) strength -= 3;
  else if (rsi > 65) strength -= 2;
  else if (rsi > 55) strength -= 1;
  
  // Trend Strength
  const trendStrength = (ema - sma) / sma * 100;
  if (trendStrength > 2) strength += 2;
  else if (trendStrength > 0.5) strength += 1;
  else if (trendStrength < -2) strength -= 2;
  else if (trendStrength < -0.5) strength -= 1;
  
  // Price vs SMA
  const priceVsSma = (price - sma) / sma * 100;
  if (priceVsSma > 3) strength += 1;
  else if (priceVsSma < -3) strength -= 1;
  
  // Volume Strength
  if (volume > 5000000) strength += 1;
  else if (volume < 100000) strength -= 1;
  
  // Foreign Activity Strength
  if (foreignNet > 2000000) strength += 1;
  else if (foreignNet < -2000000) strength -= 1;
  
  return Math.max(-5, Math.min(5, strength));
}

function calculateRiskMetrics(historical: Array<{close: number; high: number; low: number}>, currentPrice: number) {
  const closes = historical.map(h => h.close);
  const highs = historical.map(h => h.high);
  const lows = historical.map(h => h.low);
  
  // Calculate ATR
  const atr = calculateATR(historical);
  
  // Calculate volatility (standard deviation)
  const volatility = calculateVolatility(closes);
  
  // Support and Resistance
  const support = Math.min(...lows.slice(-10));
  const resistance = Math.max(...highs.slice(-10));
  
  // Risk-Reward Ratio
  const stopLoss = support;
  const takeProfit = resistance;
  const riskRewardRatio = (takeProfit - currentPrice) / (currentPrice - stopLoss);
  
  return {
    support: Number(support.toFixed(2)),
    resistance: Number(resistance.toFixed(2)),
    atr: Number(atr.toFixed(2)),
    volatility: Number(volatility.toFixed(4)),
    riskRewardRatio: Number(Math.min(riskRewardRatio, 5).toFixed(2))
  };
}

function calculateATR(data: Array<{high: number; low: number; close: number}>): number {
  let trSum = 0;
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i-1].close),
      Math.abs(data[i].low - data[i-1].close)
    );
    trSum += tr;
  }
  return trSum / (data.length - 1);
}

function calculateVolatility(prices: number[]): number {
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  return Math.sqrt(variance);
}

function getMarketSummary(stocks: IDXStockData[]) {
  const totalVolume = stocks.reduce((sum, stock) => sum + stock.Volume, 0);
  const totalValue = stocks.reduce((sum, stock) => sum + stock.Value, 0);
  const advancing = stocks.filter(stock => stock.Change > 0).length;
  const declining = stocks.filter(stock => stock.Change < 0).length;
  const unchanged = stocks.filter(stock => stock.Change === 0).length;
  
  return {
    totalStocks: stocks.length,
    totalVolume,
    totalValue,
    advancing,
    declining,
    unchanged,
    advanceDeclineRatio: advancing > 0 ? (advancing / declining) : 0
  };
}

// Cache utility functions
function getCacheKey(): string {
  const now = new Date();
  const roundedTime = new Date(Math.floor(now.getTime() / (1 * 60 * 1000)) * (1 * 60 * 1000));
  return `idx-stocks-${roundedTime.getTime()}`;
}

function getCachedData(cacheKey: string): CachedData | null {
  const cached = memoryCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  const cacheAge = now - cached.timestamp;
  const maxAge = 2 * 60 * 1000; // 2 minutes cache
  
  if (cacheAge < maxAge) {
    return cached.data;
  } else {
    memoryCache.delete(cacheKey);
    return null;
  }
}

function setCachedData(cacheKey: string, data: any): void {
  memoryCache.set(cacheKey, {
    data: {
      ...data,
      source: "IDX Complete Data + Technical Analysis"
    },
    timestamp: Date.now()
  });
  
  cleanOldCache();
}

function cleanOldCache(): void {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // Keep cache for 10 minutes max
  
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp > maxAge) {
      memoryCache.delete(key);
    }
  }
}