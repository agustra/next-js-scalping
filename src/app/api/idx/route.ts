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
  const startTime = Date.now();
  
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

    // 5. Calculate signal summary
    const signalSummary = {
      buy: sortedStocks.filter(s => s.signal === 'BUY' || s.signal === 'STRONG_BUY').length,
      sell: sortedStocks.filter(s => s.signal === 'SELL' || s.signal === 'STRONG_SELL').length,
      hold: sortedStocks.filter(s => s.signal === 'HOLD').length,
      strongBuy: sortedStocks.filter(s => s.signal === 'STRONG_BUY').length,
      strongSell: sortedStocks.filter(s => s.signal === 'STRONG_SELL').length
    };

    // 6. Advanced Analytics
    const sectorAnalysis = getSectorAnalysis(sortedStocks);
    const volumeProfile = getVolumeProfile(sortedStocks);
    const momentumAnalysis = getMomentumAnalysis(sortedStocks);
    const riskAnalysis = getRiskAnalysis(sortedStocks);

    // 7. Prepare enhanced response
    const marketStatus = getMarketStatus();
    const responseData: ResponseData = {
      source: "IDX Complete Data + Advanced Technical Analysis + Sector Intelligence",
      timestamp: Date.now(),
      totalStocks: idxData.data.length,
      activeStocks: activeStocks.length,
      processedStocks: sortedStocks.length,
      displayedStocks: sortedStocks.length,
      signalSummary,
      marketSummary: getMarketSummary(idxData.data),
      sectorAnalysis,
      volumeProfile,
      momentumAnalysis,
      riskAnalysis,
      marketStatus,
      stocks: sortedStocks,
      cached: false
    };

    // 8. Add performance metrics
    const processingTime = Date.now() - startTime;
    responseData.performance = {
      processingTime,
      stocksPerSecond: Number((sortedStocks.length / (processingTime / 1000)).toFixed(2)),
      memoryUsage: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2))
    };
    
    // 9. Cache the result
    setCachedData(cacheKey, responseData);
    console.log(`⚡ Processing completed in ${processingTime}ms`);
    console.log(`📈 Market Status: ${marketStatus.isOpen ? 'OPEN' : 'CLOSED'}`);
    console.log(`🎯 Processed ${sortedStocks.length} stocks with ${signalSummary.strongBuy + signalSummary.buy} buy signals`);

    return NextResponse.json(responseData);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ API failed after ${processingTime}ms:`, error);
    return NextResponse.json(
      { 
        error: "Failed to process IDX data",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
        processingTime
      },
      { status: 500 }
    );
  }
}

async function processStocksWithIndicators(stocks: IDXStockData[]): Promise<EnhancedStockResult[]> {
  const results: EnhancedStockResult[] = [];
  const errors: { symbol: string; error: string }[] = [];
  
  const batchSize = 20;
  
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (stock) => {
      try {
        return await processSingleStock(stock);
      } catch (error) {
        errors.push({
          symbol: stock.StockCode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean) as EnhancedStockResult[]);
    
    if (i + batchSize < stocks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} stocks failed to process:`, errors.slice(0, 5));
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
  // Enhanced historical data simulation with trend and volatility modeling
  const historical = [];
  const basePrice = stock.Previous;
  const dailyVolatility = Math.max(Math.abs(stock.Change) / basePrice, 0.01);
  
  // Create trend component based on current change
  const trendDirection = stock.Change > 0 ? 1 : stock.Change < 0 ? -1 : 0;
  const trendStrength = Math.min(Math.abs(stock.Change) / basePrice, 0.05);
  
  let currentPrice = basePrice * 0.95; // Start from lower base
  
  for (let i = 30; i > 0; i--) {
    // Add trend component (stronger at beginning, weaker at end)
    const trendFactor = (trendDirection * trendStrength * (i / 30)) / 30;
    
    // Add random walk with volatility clustering
    const randomWalk = (Math.random() - 0.5) * dailyVolatility * 2;
    
    // Mean reversion component
    const meanReversion = (basePrice - currentPrice) / basePrice * 0.1;
    
    // Calculate next price
    const priceChange = trendFactor + randomWalk + meanReversion;
    currentPrice = currentPrice * (1 + priceChange);
    
    // Ensure price stays positive and reasonable
    currentPrice = Math.max(currentPrice, basePrice * 0.5);
    currentPrice = Math.min(currentPrice, basePrice * 1.5);
    
    // Generate OHLC with realistic intraday movement
    const intradayVolatility = dailyVolatility * 0.5;
    const high = currentPrice * (1 + Math.random() * intradayVolatility);
    const low = currentPrice * (1 - Math.random() * intradayVolatility);
    
    historical.push({
      close: currentPrice,
      high: Math.max(high, currentPrice),
      low: Math.min(low, currentPrice)
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
  
  // Advanced signal weighting with confidence scoring
  const netSignals = bullishSignals - bearishSignals;
  const totalSignals = bullishSignals + bearishSignals;
  const confidence = totalSignals > 0 ? Math.abs(netSignals) / totalSignals : 0;
  
  // Market condition adjustment
  const marketCondition = getMarketCondition(price, volume, foreignNet);
  const adjustedSignals = netSignals * marketCondition;
  
  // Signal generation with confidence threshold
  if (adjustedSignals >= 4 && confidence > 0.6) return 'STRONG_BUY';
  if (adjustedSignals >= 2 && confidence > 0.4) return 'BUY';
  if (adjustedSignals <= -4 && confidence > 0.6) return 'STRONG_SELL';
  if (adjustedSignals <= -2 && confidence > 0.4) return 'SELL';
  
  return 'HOLD';
}

function getMarketCondition(price: number, volume: number, foreignNet: number): number {
  let condition = 1.0;
  
  // Volume condition (higher volume = more reliable)
  if (volume > 5000000) condition *= 1.2;
  else if (volume < 500000) condition *= 0.8;
  
  // Foreign activity condition
  if (Math.abs(foreignNet) > 1000000) condition *= 1.1;
  
  // Price level condition (avoid penny stocks)
  if (price < 100) condition *= 0.9;
  else if (price > 1000) condition *= 1.1;
  
  return Math.max(0.5, Math.min(1.5, condition));
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

// Enhanced caching dengan different TTL berdasarkan market hours
function getCacheKey(): string {
  const now = new Date();
  const marketHours = getMarketHours(now);
  
  // Different cache duration based on market hours
  const cacheDuration = marketHours.isTradingHours ? 1 : 5; // minutes
  
  const roundedTime = new Date(
    Math.floor(now.getTime() / (cacheDuration * 60 * 1000)) * (cacheDuration * 60 * 1000)
  );
  
  return `idx-stocks-${roundedTime.getTime()}`;
}

function getMarketHours(now: Date) {
  const hour = now.getHours();
  const day = now.getDay();
  
  const isWeekday = day >= 1 && day <= 5; // Monday to Friday
  const isTradingHours = hour >= 9 && hour < 16; // 9 AM to 4 PM
  
  return { isWeekday, isTradingHours };
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

interface ResponseData {
  source: string;
  timestamp: number;
  totalStocks: number;
  activeStocks: number;
  processedStocks: number;
  displayedStocks: number;
  signalSummary: {
    buy: number;
    sell: number;
    hold: number;
    strongBuy: number;
    strongSell: number;
  };
  marketSummary: ReturnType<typeof getMarketSummary>;
  sectorAnalysis: ReturnType<typeof getSectorAnalysis>;
  volumeProfile: ReturnType<typeof getVolumeProfile>;
  momentumAnalysis: ReturnType<typeof getMomentumAnalysis>;
  riskAnalysis: ReturnType<typeof getRiskAnalysis>;
  marketStatus: { isOpen: boolean; nextOpen?: string; nextClose?: string; message: string; currentTime: string };
  stocks: EnhancedStockResult[];
  cached: boolean;
  performance?: {
    processingTime: number;
    stocksPerSecond: number;
    memoryUsage: number;
  };
}

function setCachedData(cacheKey: string, data: ResponseData): void {
  memoryCache.set(cacheKey, {
    data: {
      source: "IDX Complete Data + Technical Analysis",
      timestamp: data.timestamp,
      data: data.stocks
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

// Expanded sector mapping untuk coverage lebih luas
const sectorMapping: Record<string, string> = {
  // Banking & Financial
  'BBCA': 'Banking', 'BBRI': 'Banking', 'BMRI': 'Banking', 'BBNI': 'Banking',
  'BCA': 'Banking', 'BTPN': 'Banking', 'BNGA': 'Banking', 'BJBR': 'Banking',
  'BANK': 'Banking', 'AGRO': 'Agriculture', 'AALI': 'Agriculture',
  
  // Telecom
  'TLKM': 'Telecom', 'ISAT': 'Telecom', 'EXCL': 'Telecom', 'FREN': 'Telecom',
  
  // Automotive
  'ASII': 'Automotive', 'AUTO': 'Automotive', 'IMAS': 'Automotive',
  'GJTL': 'Automotive', 'LMPI': 'Automotive',
  
  // Consumer Goods
  'UNVR': 'Consumer', 'INDF': 'Consumer', 'ICBP': 'Consumer', 'KLBF': 'Consumer',
  'MYOR': 'Consumer', 'ULTJ': 'Consumer', 'STTP': 'Consumer',
  
  // Basic Materials
  'SMGR': 'Cement', 'INTP': 'Cement', 'WTON': 'Cement', 'SMCB': 'Cement',
  'TPIA': 'Cement', 'SIDO': 'Pharmacy', 'KAEF': 'Pharmacy',
  
  // Energy & Mining
  'PGAS': 'Energy', 'ADRO': 'Mining', 'PTBA': 'Mining', 'ITMG': 'Mining',
  'ANTM': 'Mining', 'MDKA': 'Mining', 'BRPT': 'Mining', 'BUMI': 'Mining',
  
  // Tobacco
  'GGRM': 'Tobacco', 'HMSP': 'Tobacco',
  
  // Property & Real Estate
  'BSDE': 'Property', 'CTRA': 'Property', 'DMAS': 'Property', 'LPKR': 'Property',
  'PWON': 'Property', 'SMRA': 'Property',
  
  // Infrastructure
  'WIKA': 'Infrastructure', 'PTPP': 'Infrastructure', 'WSKT': 'Infrastructure',
  'JSMR': 'Infrastructure', 'ADHI': 'Infrastructure',
  
  // Technology
  'GOTO': 'Technology', 'BBHI': 'Technology', 'DMMX': 'Technology',
  'EDGE': 'Technology', 'MTDL': 'Technology'
};

// Enhanced sector detection dengan pattern matching
function getSector(symbol: string): string {
  const baseSymbol = symbol.replace('.JK', '');
  
  // Direct mapping
  if (sectorMapping[baseSymbol]) {
    return sectorMapping[baseSymbol];
  }
  
  // Pattern-based mapping
  if (baseSymbol.startsWith('B') && baseSymbol.length === 4) return 'Banking';
  if (baseSymbol.startsWith('S') && baseSymbol.length === 4) return 'Cement';
  if (baseSymbol.startsWith('T') && baseSymbol.length === 4) return 'Telecom';
  if (baseSymbol.includes('AUTO') || baseSymbol.includes('MOTOR')) return 'Automotive';
  if (baseSymbol.includes('MINING') || baseSymbol.includes('TAMBANG')) return 'Mining';
  
  return 'Others';
}

function getSectorAnalysis(stocks: EnhancedStockResult[]) {
  const sectorData: Record<string, {
    count: number;
    avgSignalStrength: number;
    buySignals: number;
    sellSignals: number;
    totalVolume: number;
    avgPrice: number;
    topPerformer: string;
    topPerformerChange: number;
  }> = {};

  stocks.forEach(stock => {
    const sector = getSector(stock.symbol);
    if (!sectorData[sector]) {
      sectorData[sector] = {
        count: 0,
        avgSignalStrength: 0,
        buySignals: 0,
        sellSignals: 0,
        totalVolume: 0,
        avgPrice: 0,
        topPerformer: stock.symbol,
        topPerformerChange: stock.changePercent
      };
    }
    
    const data = sectorData[sector];
    data.count++;
    data.avgSignalStrength += stock.signalStrength;
    data.totalVolume += stock.volume;
    data.avgPrice += stock.price;
    
    if (stock.signal.includes('BUY')) data.buySignals++;
    if (stock.signal.includes('SELL')) data.sellSignals++;
    
    if (stock.changePercent > data.topPerformerChange) {
      data.topPerformer = stock.symbol;
      data.topPerformerChange = stock.changePercent;
    }
  });

  // Calculate averages
  Object.keys(sectorData).forEach(sector => {
    const data = sectorData[sector];
    data.avgSignalStrength = Number((data.avgSignalStrength / data.count).toFixed(2));
    data.avgPrice = Number((data.avgPrice / data.count).toFixed(0));
  });

  return sectorData;
}

function getVolumeProfile(stocks: EnhancedStockResult[]) {
  const totalVolume = stocks.reduce((sum, stock) => sum + stock.volume, 0);
  const volumeRanges = {
    mega: stocks.filter(s => s.volume > 10000000).length,
    high: stocks.filter(s => s.volume > 5000000 && s.volume <= 10000000).length,
    medium: stocks.filter(s => s.volume > 1000000 && s.volume <= 5000000).length,
    low: stocks.filter(s => s.volume <= 1000000).length
  };

  const topVolumeStocks = stocks
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10)
    .map(stock => ({
      symbol: stock.symbol,
      volume: stock.volume,
      volumePercent: Number(((stock.volume / totalVolume) * 100).toFixed(2)),
      signal: stock.signal,
      changePercent: stock.changePercent
    }));

  return {
    totalVolume,
    volumeRanges,
    topVolumeStocks,
    avgVolume: Number((totalVolume / stocks.length).toFixed(0))
  };
}

function getMomentumAnalysis(stocks: EnhancedStockResult[]) {
  const momentum = {
    strongMomentum: stocks.filter(s => Math.abs(s.signalStrength) >= 3).length,
    bullishMomentum: stocks.filter(s => s.signalStrength > 0).length,
    bearishMomentum: stocks.filter(s => s.signalStrength < 0).length,
    neutralMomentum: stocks.filter(s => s.signalStrength === 0).length
  };

  const priceMovement = {
    gainers: stocks.filter(s => s.changePercent > 0).length,
    losers: stocks.filter(s => s.changePercent < 0).length,
    unchanged: stocks.filter(s => s.changePercent === 0).length,
    bigMovers: stocks.filter(s => Math.abs(s.changePercent) > 5).length
  };

  const topGainers = stocks
    .filter(s => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5)
    .map(s => ({ symbol: s.symbol, change: s.changePercent, signal: s.signal }));

  const topLosers = stocks
    .filter(s => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5)
    .map(s => ({ symbol: s.symbol, change: s.changePercent, signal: s.signal }));

  return {
    momentum,
    priceMovement,
    topGainers,
    topLosers,
    marketSentiment: momentum.bullishMomentum > momentum.bearishMomentum ? 'BULLISH' : 
                    momentum.bearishMomentum > momentum.bullishMomentum ? 'BEARISH' : 'NEUTRAL'
  };
}

function getRiskAnalysis(stocks: EnhancedStockResult[]) {
  const riskLevels = {
    lowRisk: stocks.filter(s => s.riskMetrics.volatility < 0.02).length,
    mediumRisk: stocks.filter(s => s.riskMetrics.volatility >= 0.02 && s.riskMetrics.volatility < 0.05).length,
    highRisk: stocks.filter(s => s.riskMetrics.volatility >= 0.05).length
  };

  const avgVolatility = stocks.reduce((sum, s) => sum + s.riskMetrics.volatility, 0) / stocks.length;
  const avgRiskReward = stocks.reduce((sum, s) => sum + (s.riskMetrics.riskRewardRatio || 0), 0) / stocks.length;

  const bestRiskReward = stocks
    .filter(s => s.riskMetrics.riskRewardRatio > 1.5)
    .sort((a, b) => b.riskMetrics.riskRewardRatio - a.riskMetrics.riskRewardRatio)
    .slice(0, 5)
    .map(s => ({
      symbol: s.symbol,
      riskReward: s.riskMetrics.riskRewardRatio,
      volatility: s.riskMetrics.volatility,
      signal: s.signal
    }));

  return {
    riskLevels,
    avgVolatility: Number(avgVolatility.toFixed(4)),
    avgRiskReward: Number(avgRiskReward.toFixed(2)),
    bestRiskReward,
    marketRisk: avgVolatility > 0.04 ? 'HIGH' : avgVolatility > 0.02 ? 'MEDIUM' : 'LOW'
  };
}



function getMarketStatus(): { isOpen: boolean; nextOpen?: string; nextClose?: string; message: string; currentTime: string } {
  const now = new Date();
  const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
  const hour = jakartaTime.getHours();
  const day = jakartaTime.getDay();
  
  const isWeekday = day >= 1 && day <= 5;
  const isTradingHours = hour >= 9 && hour < 16;
  const isOpen = isWeekday && isTradingHours;
  
  let message = '';
  const nextOpen = '';
  let nextClose = '';
  
  if (isOpen) {
    const closeTime = new Date(jakartaTime);
    closeTime.setHours(16, 0, 0, 0);
    const timeToClose = closeTime.getTime() - jakartaTime.getTime();
    const hoursToClose = Math.floor(timeToClose / (1000 * 60 * 60));
    const minutesToClose = Math.floor((timeToClose % (1000 * 60 * 60)) / (1000 * 60));
    
    message = `Market open - Closes in ${hoursToClose}h ${minutesToClose}m`;
    nextClose = closeTime.toISOString();
  } else {
    if (!isWeekday) {
      message = `Market closed - Weekend`;
    } else if (hour < 9) {
      message = `Market closed - Opens at 09:00`;
    } else {
      message = `Market closed - Opens tomorrow at 09:00`;
    }
  }
  
  return { 
    isOpen, 
    nextOpen, 
    nextClose,
    message,
    currentTime: jakartaTime.toISOString()
  };
}