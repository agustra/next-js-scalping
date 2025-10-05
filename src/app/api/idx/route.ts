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

interface CacheConfig {
  tradingHoursTTL: number;
  nonTradingHoursTTL: number;
  maxCacheSize: number;
  cleanupInterval: number;
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
  cacheInfo?: {
    cached: boolean;
    cacheKey: string;
    forceRefresh: boolean;
    cacheSize: number;
    cacheEnabled: boolean;
  };
}

// Enhanced Cache Configuration
const cacheConfig: CacheConfig = {
  tradingHoursTTL: 1 * 60 * 1000, // 1 menit saat market buka
  nonTradingHoursTTL: 5 * 60 * 1000, // 5 menit saat market tutup
  maxCacheSize: 50, // Maximum 50 cache entries
  cleanupInterval: 10 * 60 * 1000 // 10 menit
};

// Memory cache dengan enhanced management
const memoryCache = new Map<string, { data: CachedData; timestamp: number }>();

// Initialize cache cleanup
setInterval(cleanOldCache, cacheConfig.cleanupInterval);

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    const skipCache = url.searchParams.get('nocache') === 'true';
    
    // Cache management (skip if forced refresh)
    const cacheKey = getCacheKey();
    let cachedData = null;
    
    if (!forceRefresh && !skipCache) {
      cachedData = getCachedData(cacheKey);
    }
    
    if (cachedData && !forceRefresh) {
      console.log('📦 Serving from cache');
      return NextResponse.json({
        ...cachedData,
        source: cachedData.source + ' (Cached)',
        cached: true,
        cacheTime: new Date(cachedData.timestamp).toISOString(),
        cacheInfo: {
          cached: true,
          cacheKey,
          forceRefresh: false,
          cacheSize: memoryCache.size,
          cacheEnabled: true
        }
      });
    }
    
    if (forceRefresh) {
      console.log('🔄 Force refresh requested');
      // Clear specific cache
      memoryCache.delete(cacheKey);
    }
    
    console.log('🔄 Fetching fresh data from IDX...');
    debugSectorMapping(); // ✅ ADD THIS LINE

    const idxResponse = await fetch(`https://divine-moon-d133.agusta-usk.workers.dev/`);

    if (!idxResponse.ok) {
      throw new Error(`Failed to fetch IDX data: ${idxResponse.status}`);
    }

    const idxData = await idxResponse.json();

    if (!idxData?.data || !Array.isArray(idxData.data)) {
      throw new Error("Invalid IDX data structure");
    }

    // 2. Filter dan proses saham aktif
    // const activeStocks = idxData.data.filter((stock: IDXStockData) => {
    //   return (
    //     stock.Volume > 100000 && // Minimum volume 100k
    //     stock.Close > 50 && // Minimum price Rp 50
    //     stock.StockCode && // Valid stock code
    //     stock.Close > 0 // Positive price
    //   );
    // });

    const activeStocks = idxData.data.filter((stock: IDXStockData) => {
      return (
        stock.Volume > 1000000 &&    
        stock.Close >= 50 &&          // ✅ MINIMAL Rp 50
        stock.Close <= 100 &&         // ✅ MAKSIMAL Rp 100  
        stock.StockCode && 
        stock.Close > 0
      );
    });

    // 2. Filter dan proses saham aktif dengan kriteria ketat
    // const activeStocks = idxData.data.filter((stock: IDXStockData) => {
    //   const isLiquid = stock.Volume > 1000000;          // 1 juta shares
    //   const isReasonablePrice = stock.Close > 100;      // Rp 100+
    //   const hasRealValue = stock.Value > 100000000;     // Rp 100 juta+
    //   const isValid = stock.StockCode && stock.Close > 0;
      
    //   return isLiquid && isReasonablePrice && hasRealValue && isValid;
    // });

    console.log(`📊 ${activeStocks.length} quality stocks (from ${idxData.data.length} total)`);

    console.log(`📊 Processing ${activeStocks.length} active stocks from ${idxData.data.length} total stocks`);

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
      cached: false,
      cacheInfo: {
        cached: false,
        cacheKey,
        forceRefresh,
        cacheSize: memoryCache.size,
        cacheEnabled: !skipCache
      }
    };

    // 8. Add performance metrics
    const processingTime = Date.now() - startTime;
    responseData.performance = {
      processingTime,
      stocksPerSecond: Number((sortedStocks.length / (processingTime / 1000)).toFixed(2)),
      memoryUsage: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2))
    };
    
    // 9. Cache the result (skip if requested)
    if (!skipCache) {
      setCachedData(cacheKey, responseData);
    }
    
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

// Cache Management Functions
function getCacheKey(): string {
  const now = new Date();
  const marketHours = getMarketHours(now);
  
  // Cache duration based on market hours
  const cacheDuration = marketHours.isTradingHours ? 
    cacheConfig.tradingHoursTTL : cacheConfig.nonTradingHoursTTL;
  
  // Create time-based cache key
  const roundedTime = new Date(
    Math.floor(now.getTime() / cacheDuration) * cacheDuration
  );
  
  // Add data fingerprint untuk ensure data completeness
  const dateKey = `${roundedTime.getFullYear()}${(roundedTime.getMonth() + 1).toString().padStart(2, '0')}${roundedTime.getDate().toString().padStart(2, '0')}`;
  const hourKey = marketHours.isTradingHours ? `H${roundedTime.getHours()}` : 'CLOSED';
  
  return `idx-stocks-${dateKey}-${hourKey}-${roundedTime.getTime()}`;
}

function getCachedData(cacheKey: string): CachedData | null {
  const cached = memoryCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  const cacheAge = now - cached.timestamp;
  
  // Dynamic TTL based on market hours
  const marketHours = getMarketHours(new Date());
  const maxAge = marketHours.isTradingHours ? 
    cacheConfig.tradingHoursTTL : cacheConfig.nonTradingHoursTTL;
  
  // Additional validation: check if data is complete
  if (cacheAge < maxAge && isDataComplete(cached.data)) {
    console.log(`✅ Cache HIT: ${cached.data.data.length} stocks served`);
    return cached.data;
  } else {
    // Remove expired or incomplete cache
    memoryCache.delete(cacheKey);
    console.log(`🗑️ Cache expired/incomplete: ${cacheAge}ms old`);
    return null;
  }
}

function isDataComplete(cachedData: CachedData): boolean {
  if (!cachedData?.data || !Array.isArray(cachedData.data)) {
    return false;
  }
  
  const stocks = cachedData.data;
  
  // Check minimum data requirements
  if (stocks.length < 50) {
    console.warn(`⚠️ Cache data incomplete: only ${stocks.length} stocks`);
    return false;
  }
  
  // Check data freshness (within expected timeframe)
  const dataAge = Date.now() - cachedData.timestamp;
  const maxDataAge = 10 * 60 * 1000; // 10 menit maximum
  
  if (dataAge > maxDataAge) {
    console.warn(`⚠️ Cache data too old: ${Math.round(dataAge / 1000 / 60)} minutes`);
    return false;
  }
  
  // Check if key stocks are present (sample check)
  const keyStocks = ['BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'TLKM.JK'];
  const hasKeyStocks = keyStocks.some(symbol => 
    stocks.some(stock => stock.symbol === symbol)
  );
  
  if (!hasKeyStocks) {
    console.warn('⚠️ Cache missing key stocks');
    return false;
  }
  
  return true;
}

function setCachedData(cacheKey: string, data: ResponseData): void {
  // Validate data sebelum caching
  if (!isValidForCaching(data)) {
    console.warn('🚫 Data not suitable for caching');
    return;
  }
  
  // Clean old cache sebelum add baru
  cleanOldCache();
  
  // Limit cache size
  if (memoryCache.size >= cacheConfig.maxCacheSize) {
    const oldestKey = Array.from(memoryCache.keys())[0];
    memoryCache.delete(oldestKey);
    console.log(`🧹 Removed oldest cache: ${oldestKey}`);
  }
  
  memoryCache.set(cacheKey, {
    data: {
      source: "IDX Complete Data + Technical Analysis",
      timestamp: data.timestamp,
      data: data.stocks
    },
    timestamp: Date.now()
  });
  
  console.log(`💾 Cached ${data.stocks.length} stocks with key: ${cacheKey}`);
}

function isValidForCaching(data: ResponseData): boolean {
  // Basic validation
  if (!data?.stocks || !Array.isArray(data.stocks)) {
    return false;
  }
  
  // Minimum stocks threshold
  if (data.stocks.length < 50) {
    console.warn(`🚫 Too few stocks for caching: ${data.stocks.length}`);
    return false;
  }
  
  // Check if data has required fields
  const sampleStock = data.stocks[0];
  if (!sampleStock?.symbol || !sampleStock?.price || !sampleStock?.signal) {
    console.warn('🚫 Incomplete stock data structure');
    return false;
  }
  
  // Check signal distribution (should have variety)
  const signals = data.stocks.map(s => s.signal);
  const uniqueSignals = new Set(signals);
  if (uniqueSignals.size < 2) {
    console.warn('🚫 Insufficient signal variety for caching');
    return false;
  }
  
  return true;
}

function cleanOldCache(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of memoryCache.entries()) {
    const cacheAge = now - value.timestamp;
    const marketHours = getMarketHours(new Date(value.timestamp));
    const maxAge = marketHours.isTradingHours ? 
      cacheConfig.tradingHoursTTL : cacheConfig.nonTradingHoursTTL;
    
    if (cacheAge > maxAge) {
      memoryCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
  }
}

// Cache Management Endpoint
export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'clear':
        const sizeBefore = memoryCache.size;
        memoryCache.clear();
        return NextResponse.json({
          message: `Cache cleared (${sizeBefore} entries removed)`,
          timestamp: Date.now(),
          cacheSize: memoryCache.size
        });
        
      case 'status':
        const cacheEntries = Array.from(memoryCache.entries()).map(([key, value]) => ({
          key,
          age: Date.now() - value.timestamp,
          stocks: value.data.data.length,
          timestamp: new Date(value.timestamp).toISOString()
        }));
        
        return NextResponse.json({
          cacheSize: memoryCache.size,
          cacheEntries,
          memoryUsage: process.memoryUsage(),
          cacheConfig,
          timestamp: Date.now()
        });
        
      case 'cleanup':
        const beforeSize = memoryCache.size;
        cleanOldCache();
        const afterSize = memoryCache.size;
        return NextResponse.json({
          message: `Cache cleanup completed`,
          removed: beforeSize - afterSize,
          remaining: afterSize,
          timestamp: Date.now()
        });
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: 'Invalid request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}

// Existing functions (tetap sama seperti sebelumnya)
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
  const historical = [];
  const basePrice = stock.Previous;
  const dailyVolatility = Math.max(Math.abs(stock.Change) / basePrice, 0.01);
  
  const trendDirection = stock.Change > 0 ? 1 : stock.Change < 0 ? -1 : 0;
  const trendStrength = Math.min(Math.abs(stock.Change) / basePrice, 0.05);
  
  let currentPrice = basePrice * 0.95;
  
  for (let i = 30; i > 0; i--) {
    const trendFactor = (trendDirection * trendStrength * (i / 30)) / 30;
    const randomWalk = (Math.random() - 0.5) * dailyVolatility * 2;
    const meanReversion = (basePrice - currentPrice) / basePrice * 0.1;
    
    const priceChange = trendFactor + randomWalk + meanReversion;
    currentPrice = currentPrice * (1 + priceChange);
    
    currentPrice = Math.max(currentPrice, basePrice * 0.5);
    currentPrice = Math.min(currentPrice, basePrice * 1.5);
    
    const intradayVolatility = dailyVolatility * 0.5;
    const high = currentPrice * (1 + Math.random() * intradayVolatility);
    const low = currentPrice * (1 - Math.random() * intradayVolatility);
    
    historical.push({
      close: currentPrice,
      high: Math.max(high, currentPrice),
      low: Math.min(low, currentPrice)
    });
  }
  
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
  
  if (rsi < 25) bullishSignals += 3;
  else if (rsi < 35) bullishSignals += 2;
  else if (rsi < 45) bullishSignals += 1;
  else if (rsi > 75) bearishSignals += 3;
  else if (rsi > 65) bearishSignals += 2;
  else if (rsi > 55) bearishSignals += 1;
  
  const emaAboveSma = ema > sma;
  const priceAboveSma = price > sma;
  
  if (emaAboveSma && priceAboveSma) bullishSignals += 2;
  else if (emaAboveSma) bullishSignals += 1;
  else if (!emaAboveSma && !priceAboveSma) bearishSignals += 2;
  else if (!emaAboveSma) bearishSignals += 1;
  
  if (volume > 1000000) bullishSignals += 1;
  else if (volume < 100000) bearishSignals += 1;
  
  if (foreignNet > 1000000) bullishSignals += 1;
  else if (foreignNet < -1000000) bearishSignals += 1;
  
  if (bidAskSpread / price < 0.01) bullishSignals += 1;
  else if (bidAskSpread / price > 0.03) bearishSignals += 1;
  
  const netSignals = bullishSignals - bearishSignals;
  const totalSignals = bullishSignals + bearishSignals;
  const confidence = totalSignals > 0 ? Math.abs(netSignals) / totalSignals : 0;
  
  const marketCondition = getMarketCondition(price, volume, foreignNet);
  const adjustedSignals = netSignals * marketCondition;
  
  if (adjustedSignals >= 4 && confidence > 0.6) return 'STRONG_BUY';
  if (adjustedSignals >= 2 && confidence > 0.4) return 'BUY';
  if (adjustedSignals <= -4 && confidence > 0.6) return 'STRONG_SELL';
  if (adjustedSignals <= -2 && confidence > 0.4) return 'SELL';
  
  return 'HOLD';
}

function getMarketCondition(price: number, volume: number, foreignNet: number): number {
  let condition = 1.0;
  
  if (volume > 5000000) condition *= 1.2;
  else if (volume < 500000) condition *= 0.8;
  
  if (Math.abs(foreignNet) > 1000000) condition *= 1.1;
  
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
  
  if (rsi < 25) strength += 3;
  else if (rsi < 35) strength += 2;
  else if (rsi < 45) strength += 1;
  else if (rsi > 75) strength -= 3;
  else if (rsi > 65) strength -= 2;
  else if (rsi > 55) strength -= 1;
  
  const trendStrength = (ema - sma) / sma * 100;
  if (trendStrength > 2) strength += 2;
  else if (trendStrength > 0.5) strength += 1;
  else if (trendStrength < -2) strength -= 2;
  else if (trendStrength < -0.5) strength -= 1;
  
  const priceVsSma = (price - sma) / sma * 100;
  if (priceVsSma > 3) strength += 1;
  else if (priceVsSma < -3) strength -= 1;
  
  if (volume > 5000000) strength += 1;
  else if (volume < 100000) strength -= 1;
  
  if (foreignNet > 2000000) strength += 1;
  else if (foreignNet < -2000000) strength -= 1;
  
  return Math.max(-5, Math.min(5, strength));
}

function calculateRiskMetrics(historical: Array<{close: number; high: number; low: number}>, currentPrice: number) {
  const closes = historical.map(h => h.close);
  const highs = historical.map(h => h.high);
  const lows = historical.map(h => h.low);
  
  const atr = calculateATR(historical);
  const volatility = calculateVolatility(closes);
  const support = Math.min(...lows.slice(-10));
  const resistance = Math.max(...highs.slice(-10));
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

function getMarketHours(now: Date) {
  const hour = now.getHours();
  const day = now.getDay();
  
  const isWeekday = day >= 1 && day <= 5;
  const isTradingHours = hour >= 9 && hour < 16;
  
  return { isWeekday, isTradingHours };
}

function getMarketStatus(): { isOpen: boolean; nextOpen?: string; nextClose?: string; message: string; currentTime: string } {
  try {
    const now = new Date();
    const jakartaOffset = 7 * 60 * 60 * 1000;
    const jakartaTime = new Date(now.getTime() + jakartaOffset);
    
    const hour = jakartaTime.getUTCHours();
    const day = jakartaTime.getUTCDay();
    
    const isWeekday = day >= 1 && day <= 5;
    const isTradingHours = hour >= 9 && hour < 16;
    const isOpen = isWeekday && isTradingHours;
    
    let message = '';
    const nextOpen = '';
    let nextClose = '';
    
    if (isOpen) {
      const closeTime = new Date(jakartaTime);
      closeTime.setUTCHours(16, 0, 0, 0);
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
  } catch {
    return {
      isOpen: false,
      message: 'Market status unavailable',
      currentTime: new Date().toISOString()
    };
  }
}

// ✅ PERFECT SECTOR MAPPING - NO DUPLICATES
const sectorMapping: Record<string, string> = {
  // Banking & Financial
  'BBCA': 'Banking', 'BBRI': 'Banking', 'BMRI': 'Banking', 'BBNI': 'Banking',
  'BCA': 'Banking', 'BTPN': 'Banking', 'BNGA': 'Banking', 'BJBR': 'Banking',
  'BJTM': 'Banking', 'BKSW': 'Banking', 'BNLI': 'Banking', 'BDMN': 'Banking',
  'BBKP': 'Banking', 'BANK': 'Banking',

  // Property & Real Estate 
  'BSDE': 'Property', 'CTRA': 'Property', 'DMAS': 'Property', 'LPKR': 'Property',
  'PWON': 'Property', 'SMRA': 'Property', 'BKSL': 'Property', 'DUTI': 'Property',
  'GPRA': 'Property', 'OMRE': 'Property', 'PBSA': 'Property', 'TARA': 'Property',
  'BUVA': 'Property', 'LAND': 'Property', 'CARE': 'Property', 'SMDM': 'Property',

  // Mining & Energy
  'ADRO': 'Mining', 'PTBA': 'Mining', 'ITMG': 'Mining', 'ANTM': 'Mining',
  'MDKA': 'Mining', 'BRMS': 'Mining', 'BUMI': 'Mining', 'BYAN': 'Mining',
  'BRPT': 'Mining', 'DOID': 'Mining', 'TKIM': 'Mining', 'APEX': 'Mining',
  'HRUM': 'Mining', 'INCO': 'Mining', 'PGAS': 'Energy', 'AKRA': 'Energy',
  'ADMG': 'Energy', 'ENER': 'Energy',

  // Technology
  'GOTO': 'Technology', 'BBHI': 'Technology', 'DMMX': 'Technology',
  'EDGE': 'Technology', 'MTDL': 'Technology', 'WIFI': 'Technology',
  'RSCH': 'Technology', 'TCID': 'Technology', 'KING': 'Technology', 
  'LINK': 'Technology', 'WIRG': 'Technology', 'DIVA': 'Technology',
  'NFCX': 'Technology',

  // Agriculture & Plantation
  'AALI': 'Agriculture', 'LSIP': 'Agriculture', 'SIMP': 'Agriculture',
  'AGRO': 'Agriculture', 'MINA': 'Agriculture', 'SGRO': 'Agriculture', 
  'ALMI': 'Agriculture', 'CPRO': 'Agriculture', 'TBLA': 'Agriculture',
  'SIPD': 'Agriculture',

  // Consumer Goods
  'UNVR': 'Consumer', 'INDF': 'Consumer', 'ICBP': 'Consumer', 'KLBF': 'Consumer',
  'MYOR': 'Consumer', 'ULTJ': 'Consumer', 'STTP': 'Consumer', 'SKLT': 'Consumer',
  'CLEO': 'Consumer', 'MRAT': 'Consumer', 'ADES': 'Consumer',

  // Automotive & Manufacturing
  'ASII': 'Automotive', 'AUTO': 'Automotive', 'IMAS': 'Automotive',
  'BOLT': 'Automotive', 'JAYA': 'Automotive', 'MABA': 'Automotive',

  // Infrastructure & Construction
  'WIKA': 'Infrastructure', 'PTPP': 'Infrastructure', 'WSKT': 'Infrastructure',
  'JSMR': 'Infrastructure', 'ADHI': 'Infrastructure', 'WEGE': 'Infrastructure',
  'SSIA': 'Infrastructure', 'SOCI': 'Infrastructure',

  // Healthcare & Pharmacy
  'SIDO': 'Pharmacy', 'KAEF': 'Pharmacy', 'DVLA': 'Pharmacy', 'PEHA': 'Pharmacy',
  'TSPC': 'Pharmacy', 'MERK': 'Pharmacy', 'PYFA': 'Pharmacy', 'SILO': 'Pharmacy',

  // Transportation & Logistics
  'GIAA': 'Transportation', 'LPPF': 'Transportation', 'MIRA': 'Transportation',
  'TAXI': 'Transportation', 'BLTA': 'Transportation', 'BPTR': 'Transportation',

  // Telecom
  'TLKM': 'Telecom', 'ISAT': 'Telecom', 'EXCL': 'Telecom', 'FREN': 'Telecom',

  // Tobacco
  'GGRM': 'Tobacco', 'HMSP': 'Tobacco',

  // Cement & Building Materials
  'SMGR': 'Cement', 'INTP': 'Cement', 'SMCB': 'Cement', 'TPIA': 'Cement'
};

// ✅ ROBUST SECTOR DETECTION
function getSector(symbol: string): string {
  // Handle case sensitivity and .JK suffix
  const baseSymbol = symbol.replace('.JK', '').toUpperCase();
  
  console.log(`🔍 Mapping: ${symbol} -> base: ${baseSymbol}`); // DEBUG
  
  // 1. Direct mapping first
  if (sectorMapping[baseSymbol]) {
    return sectorMapping[baseSymbol];
  }
  
  // 2. Enhanced pattern matching
  const symbolUpper = baseSymbol.toUpperCase();
  
  if (symbolUpper.includes('BANK') || symbolUpper.includes('BPR') || 
      symbolUpper.includes('FINAN')) {
    return 'Banking';
  }
  
  if (symbolUpper.includes('MINING') || symbolUpper.includes('TAMBANG') || 
      symbolUpper.includes('COAL') || symbolUpper.includes('MINERAL') ||
      symbolUpper.includes('RESOURCE')) {
    return 'Mining';
  }
  
  if (symbolUpper.includes('PROP') || symbolUpper.includes('REAL') || 
      symbolUpper.includes('LAND') || symbolUpper.includes('ESTATE') ||
      symbolUpper.includes('CITY')) {
    return 'Property';
  }
  
  if (symbolUpper.includes('TECH') || symbolUpper.includes('DIGITAL') || 
      symbolUpper.includes('SOFT') || symbolUpper.includes('NET') ||
      symbolUpper.includes('SYSTEM') || symbolUpper.includes('COMP')) {
    return 'Technology';
  }
  
  if (symbolUpper.includes('FARM') || symbolUpper.includes('AGRIC') || 
      symbolUpper.includes('FOOD') || symbolUpper.includes('PLANT') ||
      symbolUpper.includes('FISH') || symbolUpper.includes('FARMA')) {
    return 'Agriculture';
  }
  
  if (symbolUpper.includes('CONST') || symbolUpper.includes('BUILD') || 
      symbolUpper.includes('INFRA') || symbolUpper.includes('CONSTR')) {
    return 'Infrastructure';
  }
  
  // 3. Check company name if available (future enhancement)
    // Direct mapping only - no pattern matching
  return sectorMapping[baseSymbol] || 'Others';
}

// ✅ DEBUG FUNCTION - tambahkan ini
function debugSectorMapping() {
  const testSymbols = ['BKSL', 'BRMS', 'WIFI', 'APEX', 'WIRG', 'MINA'];
  
  console.log('🔍 DEBUG SECTOR MAPPING:');
  testSymbols.forEach(symbol => {
    const sector = getSector(symbol);
    console.log(`${symbol} -> ${sector}`);
  });
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
