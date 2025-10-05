
import yahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";
import { RSI, SMA, EMA, MACD, BollingerBands, Stochastic } from 'technicalindicators';

interface CachedData {
  source: string;
  timestamp: number;
  [key: string]: unknown;
}

interface RiskMetrics {
  volatility: number;
  support: number;
  resistance: number;
  atr: number; // Average True Range
  riskRewardRatio: number;
  confidence: number;
}

interface StockResult {
  signalStrength: number;
  indicators?: {
    rsi: number | null;
    sma20: number | null;
    ema12: number | null;
    macd?: {
      MACD: number | null;
      signal: number | null;
      histogram: number | null;
    };
    bb?: {
      upper: number | null;
      middle: number | null;
      lower: number | null;
    };
    stoch?: {
      k: number | null;
      d: number | null;
    };
  };
  riskMetrics?: RiskMetrics;
  [key: string]: unknown;
}

export async function GET() {
  try {
    // Cache management
    const cacheKey = getCacheKey();
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('📦 Serving from cache');
      const cached = cachedData as CachedData;
      return NextResponse.json({
        ...cached,
        source: cached.source + ' (Cached)',
        cached: true,
        cacheTime: new Date(cached.timestamp).toISOString()
      });
    }
    
    console.log('🔄 Fetching fresh data...');
    
    // Get market context with fallback
    let marketContext;
    try {
      marketContext = await getMarketCondition();
    } catch (error) {
      console.error('Market context failed:', error);
      marketContext = { trend: 'UNKNOWN', strength: 0, condition: 'Market data unavailable' };
    }
    
    // 1. Ambil data saham dari IDX dengan fallback
    let symbols: string[] = [];
    let totalIDX = 0;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const idxResponse = await fetch(
        "https://www.idx.co.id/primary/TradingSummary/GetStockSummary",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (idxResponse.ok) {
        const idxData = await idxResponse.json();
        
        if (idxData?.data && Array.isArray(idxData.data)) {
          totalIDX = idxData.data.length;
          symbols = idxData.data
            .filter((stock: { Volume: string; StockCode: string }) => {
              const volume = Number(stock.Volume);
              return !isNaN(volume) && volume > 0 && stock.StockCode;
            })
            .sort((a: { Volume: string }, b: { Volume: string }) => 
              Number(b.Volume) - Number(a.Volume)
            )
            .map((stock: { StockCode: string }) => `${stock.StockCode}.JK`);
        }
      }
    } catch (error) {
      console.error('IDX API failed:', error);
    }
    
    // Fallback to popular IDX stocks if API fails
    if (symbols.length === 0) {
      symbols = [
        'BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'TLKM.JK', 'ASII.JK',
        'UNVR.JK', 'ICBP.JK', 'KLBF.JK', 'INDF.JK', 'GGRM.JK',
        'SMGR.JK', 'PGAS.JK', 'ADRO.JK', 'ITMG.JK', 'PTBA.JK'
      ];
      totalIDX = symbols.length;
      console.log('Using fallback stock symbols');
    }

    // 3. Get enhanced data with indicators
    const results: StockResult[] = [];
    const batchSize = 3; // Further reduce batch size to avoid rate limiting
    const period2 = new Date();
    const period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Process all symbols in batches with delay
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (symbol) => {
        try {
          // Add retry logic for Yahoo Finance API
          const quote = await retryYahooCall(() => yahooFinance.quote(symbol));
          
          // Skip if no price data
          if (!quote?.regularMarketPrice) return;
          
          // Get 30 days historical for indicators with retry
          const historical = await retryYahooCall(() => yahooFinance.historical(symbol, {
            period1,
            period2,
            interval: '1d'
          }));

          if (historical.length >= 14) {
            const closes = historical.map((h: { close: number }) => h.close);
            
            // Calculate indicators optimized for day trading
            const rsi = RSI.calculate({ values: closes, period: 9 }); // More sensitive for day trading
            const sma20 = SMA.calculate({ values: closes, period: 10 }); // Shorter period
            const ema12 = EMA.calculate({ values: closes, period: 5 }); // Fast EMA for scalping
            const macd = MACD.calculate({ 
              values: closes, 
              fastPeriod: 5, // Faster for day trading
              slowPeriod: 13, 
              signalPeriod: 4,
              SimpleMAOscillator: false,
              SimpleMASignal: false
            });
            const bb = BollingerBands.calculate({ values: closes, period: 10, stdDev: 1.5 }); // Tighter bands for scalping
            const highs = historical.map(h => h.high);
            const lows = historical.map(h => h.low);
            const stoch = Stochastic.calculate({ 
              high: highs, 
              low: lows, 
              close: closes, 
              period: 5, // Fast stochastic for day trading
              signalPeriod: 2 
            });
            
            const currentRSI = rsi[rsi.length - 1] || null;
            const currentSMA = sma20[sma20.length - 1] || null;
            const currentEMA = ema12[ema12.length - 1] || null;
            const currentMACD = macd[macd.length - 1] || null;
            const currentBB = bb[bb.length - 1] || null;
            const currentStoch = stoch[stoch.length - 1] || null;
            
            // Calculate risk metrics
            const riskMetrics = calculateRiskMetrics(historical, quote.regularMarketPrice!);
            const signal = generateEnhancedSignal(quote as { regularMarketPrice: number }, currentRSI, currentSMA, currentEMA, quote.regularMarketVolume);
            const validatedSignal = validateSignal(signal, { rsi: currentRSI, bb: currentBB, volume: quote.regularMarketVolume }, riskMetrics);
            
            results.push({
              ...quote,
              indicators: {
                rsi: currentRSI,
                sma20: currentSMA,
                ema12: currentEMA,
                macd: currentMACD ? {
                  MACD: currentMACD.MACD ?? null,
                  signal: currentMACD.signal ?? null,
                  histogram: currentMACD.histogram ?? null
                } : undefined,
                bb: currentBB ? {
                  upper: currentBB.upper,
                  middle: currentBB.middle,
                  lower: currentBB.lower
                } : undefined,
                stoch: currentStoch ? {
                  k: currentStoch.k,
                  d: currentStoch.d
                } : undefined
              },
              signal: validatedSignal,
              signalStrength: calculateSignalStrength(currentRSI, currentSMA, currentEMA, quote.regularMarketPrice!, quote.regularMarketVolume),
              riskMetrics
            });
          }
        } catch (err) {
          // Skip logging for known rate limit errors to reduce noise
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          if (!errorMsg.includes('Edge: Too') && !errorMsg.includes('not valid JSON')) {
            console.error('Failed to process symbol:', { symbol: symbol.replace(/[^A-Z0-9.]/g, ''), error: errorMsg });
          }
        }
      }));
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay
      }
    }

    // 4. Sort by signal strength and RSI extremes
    const sortedResults = results.sort((a, b) => {
      // Primary: Signal strength
      if (a.signalStrength !== b.signalStrength) {
        return Math.abs(b.signalStrength) - Math.abs(a.signalStrength);
      }
      // Secondary: RSI extremes (oversold/overbought)
      const aRsiExtreme = Math.abs(50 - (a.indicators?.rsi || 50));
      const bRsiExtreme = Math.abs(50 - (b.indicators?.rsi || 50));
      return bRsiExtreme - aRsiExtreme;
    });

    // 5. Prepare response with market context
    const responseData = {
      source: "IDX + Yahoo Finance + Enhanced Technical Analysis + Risk Management",
      marketContext,
      totalIDX,
      totalActive: symbols.length,
      totalQuotes: sortedResults.length,
      quotes: sortedResults,
      timestamp: Date.now(),
      cached: false
    };
    
    // 6. Cache the result
    setCachedData(cacheKey, responseData);
    console.log('💾 Data cached successfully');
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch IDX + Yahoo Finance data" },
      { status: 500 }
    );
  }
}

function generateEnhancedSignal(quote: { regularMarketPrice: number }, rsi: number | null, sma20: number | null, ema12: number | null, volume?: number | null) {
  if (!rsi || !sma20 || !ema12) return 'HOLD';
  
  const price = quote.regularMarketPrice;
  const emaCrossover = ema12 > sma20;
  
  // Multi-indicator signal logic
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // RSI signals optimized for day trading (more sensitive)
  if (rsi < 25) bullishSignals += 3; // Extreme oversold
  else if (rsi < 35) bullishSignals += 2; // Oversold
  else if (rsi < 45) bullishSignals += 1; // Mild oversold
  else if (rsi > 75) bearishSignals += 3; // Extreme overbought
  else if (rsi > 65) bearishSignals += 2; // Overbought
  else if (rsi > 55) bearishSignals += 1; // Mild overbought
  
  // MA signals (Secondary indicator)
  if (emaCrossover && price > sma20) bullishSignals += 2;
  else if (emaCrossover) bullishSignals += 1;
  else if (!emaCrossover && price < sma20) bearishSignals += 2;
  else if (!emaCrossover) bearishSignals += 1;
  
  // Generate final signal optimized for day trading
  if (rsi > 75 && bearishSignals >= 3) return 'SELL'; // Override for extreme overbought
  if (rsi < 25 && bullishSignals >= 3) return 'BUY'; // Override for extreme oversold
  
  // Volume confirmation for day trading
  let volumeMultiplier = 1;
  if (volume && volume > 1000000) volumeMultiplier = 1.2; // High volume boost
  else if (volume && volume < 100000) volumeMultiplier = 0.8; // Low volume penalty
  
  // Net signal calculation with volume adjustment
  const netSignal = Math.round((bullishSignals - bearishSignals) * volumeMultiplier);
  
  if (netSignal >= 3) return 'STRONG_BUY';
  if (netSignal >= 1) return 'BUY';
  if (netSignal <= -3) return 'STRONG_SELL';
  if (netSignal <= -1) return 'SELL';
  
  return 'HOLD';
}

// Risk Management Functions
function calculateRiskMetrics(historical: { high: number; low: number; close: number }[], currentPrice: number): RiskMetrics {
  const closes = historical.map(h => h.close);
  const highs = historical.map(h => h.high);
  const lows = historical.map(h => h.low);
  
  // Calculate ATR (Average True Range)
  const atr = calculateATR(historical.slice(-14));
  
  // Calculate volatility (14-day standard deviation)
  const volatility = calculateVolatility(closes.slice(-14));
  
  // Find support and resistance levels
  const support = Math.min(...lows.slice(-10));
  const resistance = Math.max(...highs.slice(-10));
  
  // Risk-Reward Ratio
  const riskRewardRatio = (resistance - currentPrice) / (currentPrice - support);
  
  // Confidence based on price position
  const priceRange = resistance - support;
  const pricePosition = (currentPrice - support) / priceRange;
  const confidence = Math.abs(0.5 - pricePosition) * 2; // Higher when near extremes
  
  return {
    volatility: Number(volatility.toFixed(2)),
    support: Number(support.toFixed(0)),
    resistance: Number(resistance.toFixed(0)),
    atr: Number(atr.toFixed(2)),
    riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
    confidence: Number((confidence * 100).toFixed(0))
  };
}

function calculateATR(data: { high: number; low: number; close: number }[]): number {
  let atrSum = 0;
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i-1].close),
      Math.abs(data[i].low - data[i-1].close)
    );
    atrSum += tr;
  }
  return atrSum / (data.length - 1);
}

function calculateVolatility(closes: number[]): number {
  const mean = closes.reduce((a, b) => a + b) / closes.length;
  const variance = closes.reduce((sum, close) => sum + Math.pow(close - mean, 2), 0) / closes.length;
  return Math.sqrt(variance);
}

// Signal Validation with False Signal Protection
function validateSignal(signal: string, indicators: { volume?: number | null; bb?: { lower: number; upper: number }; rsi?: number | null }, riskMetrics: RiskMetrics): string {
  if (signal === 'HOLD') return signal;
  
  // Volume spike verification
  const hasVolumeConfirmation = indicators.volume && indicators.volume > 500000;
  
  // Risk-Reward validation
  const goodRiskReward = riskMetrics.riskRewardRatio > 1.5;
  
  // High volatility warning
  const highVolatility = riskMetrics.volatility > riskMetrics.atr * 2;
  
  // Confidence threshold
  const highConfidence = riskMetrics.confidence > 60;
  
  // Downgrade signal if conditions not met
  if (!hasVolumeConfirmation || !goodRiskReward || highVolatility || !highConfidence) {
    if (signal === 'STRONG_BUY') return 'BUY';
    if (signal === 'STRONG_SELL') return 'SELL';
    if (signal === 'BUY' || signal === 'SELL') return 'HOLD';
  }
  
  return signal;
}

// Market Context Analysis with retry and fallback
async function getMarketCondition() {
  try {
    // Use retry logic for Yahoo Finance calls
    const ihsgQuote = await retryYahooCall(() => yahooFinance.quote('^JKSE'));
    const ihsgHistorical = await retryYahooCall(() => yahooFinance.historical('^JKSE', {
      period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d'
    }));
    
    if (ihsgHistorical.length < 10) {
      return { trend: 'UNKNOWN', strength: 0, condition: 'Data insufficient' };
    }
    
    const closes = ihsgHistorical.map(h => h.close);
    const sma10 = SMA.calculate({ values: closes, period: 10 });
    const currentSMA = sma10[sma10.length - 1];
    const currentPrice = ihsgQuote.regularMarketPrice || closes[closes.length - 1];
    
    // Determine market trend
    const trendStrength = ((currentPrice - currentSMA) / currentSMA) * 100;
    let trend = 'SIDEWAYS';
    let condition = 'Neutral Market';
    
    if (trendStrength > 2) {
      trend = 'BULLISH';
      condition = 'Strong Bull Market';
    } else if (trendStrength > 0.5) {
      trend = 'MILD_BULLISH';
      condition = 'Mild Bull Market';
    } else if (trendStrength < -2) {
      trend = 'BEARISH';
      condition = 'Strong Bear Market';
    } else if (trendStrength < -0.5) {
      trend = 'MILD_BEARISH';
      condition = 'Mild Bear Market';
    }
    
    return {
      trend,
      strength: Number(trendStrength.toFixed(2)),
      condition,
      ihsgPrice: currentPrice,
      ihsgChange: ihsgQuote.regularMarketChangePercent || 0
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Market context error:', errorMsg);
    
    // Return fallback market context
    return { 
      trend: 'SIDEWAYS', 
      strength: 0, 
      condition: 'Market data temporarily unavailable',
      ihsgPrice: 7000, // Approximate IHSG level
      ihsgChange: 0
    };
  }
}

function calculateSignalStrength(rsi: number | null, sma20: number | null, ema12: number | null, price: number, volume?: number | null): number {
  if (!rsi || !sma20 || !ema12) return 0;
  
  // First calculate the same logic as signal generation for consistency
  const emaCrossover = ema12 > sma20;
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // RSI signals (matching generateEnhancedSignal for day trading)
  if (rsi < 25) bullishSignals += 3;
  else if (rsi < 35) bullishSignals += 2;
  else if (rsi < 45) bullishSignals += 1;
  else if (rsi > 75) bearishSignals += 3;
  else if (rsi > 65) bearishSignals += 2;
  else if (rsi > 55) bearishSignals += 1;
  
  // MA signals (matching generateEnhancedSignal)
  if (emaCrossover && price > sma20) bullishSignals += 2;
  else if (emaCrossover) bullishSignals += 1;
  else if (!emaCrossover && price < sma20) bearishSignals += 2;
  else if (!emaCrossover) bearishSignals += 1;
  
  // Volume confirmation for day trading
  let volumeMultiplier = 1;
  if (volume && volume > 1000000) volumeMultiplier = 1.2;
  else if (volume && volume < 100000) volumeMultiplier = 0.8;
  
  // Base strength from net signals with volume adjustment
  let strength = Math.round((bullishSignals - bearishSignals) * volumeMultiplier);
  
  // Fine-tuning adjustments for day trading
  const crossoverRatio = ema12 / sma20;
  if (crossoverRatio > 1.02) strength += 1; // Momentum boost
  else if (crossoverRatio < 0.98) strength -= 1; // Momentum penalty
  
  // Price momentum adjustment (tighter for day trading)
  const priceVsSMA = price / sma20;
  if (priceVsSMA > 1.05) strength += 1;
  else if (priceVsSMA < 0.95) strength -= 1;
  
  return Math.max(-5, Math.min(5, strength));
}

// Retry logic for Yahoo Finance API with timeout
async function retryYahooCall<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * i));
      }
      
      // Add timeout wrapper
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 8000)
        )
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (i < maxRetries && (
        errorMsg.includes('timeout') ||
        errorMsg.includes('Edge: Too') || 
        errorMsg.includes('not valid JSON') ||
        errorMsg.includes('Too Many Requests') ||
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('ETIMEDOUT')
      )) {
        // Add longer delay for rate limit errors
        if (errorMsg.includes('Too Many Requests')) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Memory cache for Vercel deployment
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

// Cache utility functions
function getCacheKey(): string {
  // Cache key berdasarkan 1-minute intervals untuk day trading
  const now = new Date();
  const roundedTime = new Date(Math.floor(now.getTime() / (1 * 60 * 1000)) * (1 * 60 * 1000));
  return `stocks-${roundedTime.getTime()}`;
}

function getCachedData(cacheKey: string): unknown | null {
  const cached = memoryCache.get(cacheKey);
  if (!cached) return null;
  
  // Check if cache is still valid (1 minute for day trading)
  const now = Date.now();
  const cacheAge = now - cached.timestamp;
  const maxAge = 1 * 60 * 1000; // 1 minute
  
  if (cacheAge < maxAge) {
    return cached.data;
  } else {
    // Cache expired, remove it
    memoryCache.delete(cacheKey);
    return null;
  }
}

function setCachedData(cacheKey: string, data: unknown): void {
  memoryCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  // Clean old cache entries
  cleanOldCache();
}

function cleanOldCache(): void {
  const now = Date.now();
  const maxAge = 2 * 60 * 1000; // Keep cache for 2 minutes max for day trading
  
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp > maxAge) {
      memoryCache.delete(key);
    }
  }
}
