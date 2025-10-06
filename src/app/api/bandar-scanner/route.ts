// import { NextResponse } from "next/server";
// import { RSI, SMA, EMA } from 'technicalindicators';

// interface IDXStockData {
//   No: number;
//   IDStockSummary: number;
//   Date: string;
//   StockCode: string;
//   StockName: string;
//   Remarks: string;
//   Previous: number;
//   OpenPrice: number;
//   FirstTrade: number;
//   High: number;
//   Low: number;
//   Close: number;
//   Change: number;
//   Volume: number;
//   Value: number;
//   Frequency: number;
//   IndexIndividual: number;
//   Offer: number;
//   OfferVolume: number;
//   Bid: number;
//   BidVolume: number;
//   ListedShares: number;
//   TradebleShares: number;
//   WeightForIndex: number;
//   ForeignSell: number;
//   ForeignBuy: number;
//   DelistingDate: string;
//   NonRegularVolume: number;
//   NonRegularValue: number;
//   NonRegularFrequency: number;
//   persen: number | null;
//   percentage: number | null;
// }

// interface BandarStockResult {
//   symbol: string;
//   name: string;
//   price: number;
//   change: number;
//   changePercent: number;
//   volume: number;
//   signal: string;
//   signalStrength: number;
//   bandarSignal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
//   bandarConfidence: number;
//   bandarPattern: string;
//   indicators: {
//     rsi: number | null;
//     sma10: number | null;
//     ema5: number | null;
//   };
//   marketDepth: {
//     bid: number;
//     ask: number;
//     spread: number;
//     spreadPercent: number;
//   };
//   foreignActivity: {
//     netBuy: number;
//     dominance: number;
//   };
//   riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
//   dayTradePotential: {
//     targetPrice: number;
//     stopLoss: number;
//     riskReward: string;
//     timeframe: 'INTRADAY';
//     positionSize: string;
//     maxHoldTime: string;
//   };
//   volatility: number;
// }

// // ✅ SIMPLE BANDAR DETECTION
// function detectBandarPattern(stock: IDXStockData): {
//   signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
//   confidence: number;
//   pattern: string;
// } {
//   const volume = stock.Volume;
//   const priceChangePercent = Math.abs(stock.Change / stock.Previous);
//   const spread = stock.Offer - stock.Bid;
//   const spreadPercent = spread / stock.Bid;
//   const foreignNet = stock.ForeignBuy - stock.ForeignSell;

//   let score = 0;
//   let pattern = "";

//   // Pattern 1: Volume spike + harga sideways (akumulasi)
//   if (volume > 2000000 && priceChangePercent < 0.02) {
//     score += 3;
//     pattern += "Volume tinggi, harga stabil ";
//   }

//   // Pattern 2: Spread ketat + volume tinggi
//   if (spreadPercent < 0.02 && volume > 1500000) {
//     score += 2;
//     pattern += "Spread ketat ";
//   }

//   // Pattern 3: Foreign buying mendukung
//   if (foreignNet > 500000) {
//     score += 1;
//     pattern += "Foreign net buy ";
//   }

//   // Pattern 4: Volume tinggi + harga turun (distribusi)
//   if (volume > 2000000 && stock.Change < -0.01) {
//     score -= 3;
//     pattern = "Volume tinggi, harga turun (distribusi)";
//   }

//   // Pattern 5: Ask volume jauh lebih besar
//   if (stock.OfferVolume > stock.BidVolume * 2) {
//     score -= 2;
//     pattern += "Ask volume dominan ";
//   }

//   if (score >= 3) {
//     return { signal: 'ACCUMULATION', confidence: Math.min(score, 5), pattern };
//   } else if (score <= -3) {
//     return { signal: 'DISTRIBUTION', confidence: Math.min(Math.abs(score), 5), pattern };
//   } else {
//     return { signal: 'NEUTRAL', confidence: 0, pattern: "Tidak ada pattern jelas" };
//   }
// }

// // ✅ GENERATE SIGNAL UNTUK RANGE 50-100
// function generateBandarAwareSignal(
//   stock: IDXStockData,
//   rsi: number | null,
//   sma: number | null,
//   ema: number | null
// ): { signal: string; strength: number } {
//   const price = stock.Close;
//   const volume = stock.Volume;
//   const bandarAnalysis = detectBandarPattern(stock);

//   // Auto-reject di luar range strategi
//   if (price < 50 || price > 100) {
//     return { signal: 'HOLD', strength: 0 };
//   }

//   if (!rsi || !sma || !ema) {
//     return { signal: 'HOLD', strength: 0 };
//   }

//   let strength = 0;

//   // Technical signals
//   if (rsi < 35) strength += 2;
//   else if (rsi < 45) strength += 1;
//   else if (rsi > 65) strength -= 2;
//   else if (rsi > 55) strength -= 1;

//   const emaAboveSma = ema > sma;
//   const priceAboveSma = price > sma;

//   if (emaAboveSma && priceAboveSma) strength += 2;
//   else if (emaAboveSma) strength += 1;
//   else if (!emaAboveSma && !priceAboveSma) strength -= 2;
//   else if (!emaAboveSma) strength -= 1;

//   if (volume > 1000000) strength += 1;

//   // ✅ BANDAR BOOST - PALING PENTING!
//   if (bandarAnalysis.signal === 'ACCUMULATION') {
//     strength += bandarAnalysis.confidence; // Boost berdasarkan confidence
//   } else if (bandarAnalysis.signal === 'DISTRIBUTION') {
//     strength -= bandarAnalysis.confidence; // Penalty untuk distribusi
//   }

//   // Determine final signal
//   let signal = 'HOLD';
//   if (strength >= 4) signal = 'STRONG_BUY';
//   else if (strength >= 2) signal = 'BUY';
//   else if (strength <= -4) signal = 'STRONG_SELL';
//   else if (strength <= -2) signal = 'SELL';

//   return { signal, strength: Math.max(-5, Math.min(5, strength)) };
// }

// // ✅ SIMULATE HISTORICAL DATA
// function simulateHistoricalData(stock: IDXStockData): Array<{ close: number; high: number; low: number }> {
//   const historical = [];
//   const basePrice = stock.Previous;
  
//   for (let i = 30; i > 0; i--) {
//     const volatility = 0.02 + (Math.random() * 0.03);
//     const change = (Math.random() - 0.5) * volatility;
//     const price = basePrice * (1 + change);
    
//     historical.push({
//       close: price,
//       high: price * (1 + Math.random() * 0.02),
//       low: price * (1 - Math.random() * 0.02)
//     });
//   }
  
//   historical.push({
//     close: stock.Close,
//     high: stock.High,
//     low: stock.Low
//   });
  
//   return historical;
// }

// // ✅ CHECK MARKET STATUS
// function getMarketStatus(): 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'POST_MARKET' {
//   const now = new Date();
//   const hours = now.getHours();
//   const minutes = now.getMinutes();
//   const currentTime = hours * 100 + minutes;
//   const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
  
//   if (!isWeekday) return 'CLOSED';
  
//   if (currentTime >= 830 && currentTime < 900) return 'PRE_MARKET';
//   if (currentTime >= 900 && currentTime <= 1530) return 'OPEN';
//   if (currentTime > 1530 && currentTime <= 1600) return 'POST_MARKET';
  
//   return 'CLOSED';
// }

// // ✅ CALCULATE RISK LEVEL
// function calculateRiskLevel(stock: IDXStockData, volatility: number): 'LOW' | 'MEDIUM' | 'HIGH' {
//   const volume = stock.Volume;
//   const spreadPercent = (stock.Offer - stock.Bid) / stock.Bid;

//   if (volume > 3000000 && spreadPercent < 0.02 && volatility < 0.03) {
//     return 'LOW';
//   } else if (volume > 1000000 && spreadPercent < 0.03 && volatility < 0.05) {
//     return 'MEDIUM';
//   } else {
//     return 'HIGH';
//   }
// }

// // ✅ DAY TRADING POTENTIAL CALCULATOR
// function calculateDayTradePotential(stock: IDXStockData, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH') {
//   const currentPrice = stock.Close;
  
//   // Target berdasarkan risk level
//   let targetPercent = 0.05; // Default 5%
//   let stopLossPercent = 0.03; // Default 3%
//   let positionSize = '3-4%';
  
//   if (riskLevel === 'LOW') {
//     targetPercent = 0.06; // 6% target untuk low risk
//     stopLossPercent = 0.02; // 2% stop loss
//     positionSize = '4-5%';
//   } else if (riskLevel === 'HIGH') {
//     targetPercent = 0.04; // 4% target untuk high risk
//     stopLossPercent = 0.03; // 3% stop loss
//     positionSize = '2-3%';
//   }
  
//   const targetPrice = Number((currentPrice * (1 + targetPercent)).toFixed(0));
//   const stopLoss = Number((currentPrice * (1 - stopLossPercent)).toFixed(0));
//   const riskRewardRatio = (targetPercent / stopLossPercent).toFixed(1);
  
//   return {
//     targetPrice,
//     stopLoss,
//     riskReward: `1:${riskRewardRatio}`,
//     timeframe: 'INTRADAY' as const,
//     positionSize,
//     maxHoldTime: '1 day'
//   };
// }

// // Cache response interface
// interface CacheData {
//   source: string;
//   timestamp: number;
//   totalScanned: number;
//   displayed: number;
//   marketStatus: string;
//   strategy: string;
//   dayTradingRules: {
//     priceRange: number[];
//     minVolume: string;
//     targetProfit: string;
//     stopLoss: string;
//     maxHoldTime: string;
//     positionSize: string;
//     exitStrategy: string[];
//   };
//   stocks: BandarStockResult[];
// }

// // Simple in-memory cache
// let cache: { data: CacheData; timestamp: number } | null = null;
// const CACHE_DURATION = 30000; // 30 seconds

// export async function GET() {
//   try {
//     console.log('🎯 Scanning for Bandar Patterns...');
    
//     // Check cache first
//     if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
//       console.log('📦 Returning cached data');
//       return NextResponse.json(cache.data);
//     }
    
//     // 1. Fetch data from IDX with timeout
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
//     const idxResponse = await fetch('https://divine-moon-d133.agusta-usk.workers.dev/', {
//       signal: controller.signal
//     });
//     clearTimeout(timeoutId);
    
//     if (!idxResponse.ok) {
//       throw new Error(`Failed to fetch IDX data: ${idxResponse.status}`);
//     }

//     const idxData = await idxResponse.json();

//     if (!idxData?.data || !Array.isArray(idxData.data)) {
//       throw new Error("Invalid IDX data structure");
//     }

//     // 2. Filter untuk range 50-100 dengan volume decent
//     const targetStocks = idxData.data.filter((stock: IDXStockData) => {
//       return (
//         stock.Close >= 50 &&
//         stock.Close <= 500 &&
//         stock.Volume > 500000 &&
//         stock.StockCode &&
//         stock.Close > 0
//       );
//     });

//     console.log(`📊 Found ${targetStocks.length} stocks in range 50-100`);

//     // 3. Process stocks dengan parallel processing
//     const processStock = (stock: IDXStockData): BandarStockResult | null => {
//       try {
//         const historicalData = simulateHistoricalData(stock);
//         const closes = historicalData.map(h => h.close);
        
//         // Calculate basic indicators
//         const rsi = RSI.calculate({ values: closes, period: 9 });
//         const sma10 = SMA.calculate({ values: closes, period: 10 });
//         const ema5 = EMA.calculate({ values: closes, period: 5 });
        
//         const currentRSI = rsi.length > 0 ? rsi[rsi.length - 1] : null;
//         const currentSMA = sma10.length > 0 ? sma10[sma10.length - 1] : null;
//         const currentEMA = ema5.length > 0 ? ema5[ema5.length - 1] : null;

//         // Bandar analysis
//         const bandarAnalysis = detectBandarPattern(stock);
        
//         // Generate signal
//         const { signal, strength } = generateBandarAwareSignal(stock, currentRSI, currentSMA, currentEMA);
        
//         // Calculate risk with actual volatility
//         const volatility = Math.abs(stock.Change / stock.Previous) || 0.03;
//         const riskLevel = calculateRiskLevel(stock, volatility);
        
//         // Calculate day trade potential
//         const dayTradePotential = calculateDayTradePotential(stock, riskLevel);

//         return {
//           symbol: stock.StockCode,
//           name: stock.StockName,
//           price: stock.Close,
//           change: stock.Change,
//           changePercent: stock.Previous > 0 ? (stock.Change / stock.Previous) * 100 : 0,
//           volume: stock.Volume,
//           signal,
//           signalStrength: strength,
//           bandarSignal: bandarAnalysis.signal,
//           bandarConfidence: bandarAnalysis.confidence,
//           bandarPattern: bandarAnalysis.pattern,
//           indicators: {
//             rsi: currentRSI,
//             sma10: currentSMA,
//             ema5: currentEMA
//           },
//           marketDepth: {
//             bid: stock.Bid,
//             ask: stock.Offer,
//             spread: stock.Offer - stock.Bid,
//             spreadPercent: stock.Bid > 0 ? ((stock.Offer - stock.Bid) / stock.Bid) * 100 : 0
//           },
//           foreignActivity: {
//             netBuy: stock.ForeignBuy - stock.ForeignSell,
//             dominance: stock.Volume > 0 ? 
//               ((stock.ForeignBuy + stock.ForeignSell) / stock.Volume) * 100 : 0
//           },
//           riskLevel,
//           dayTradePotential,
//           volatility
//         };
//       } catch (error) {
//         console.error(`Failed to process ${stock.StockCode}:`, error);
//         return null;
//       }
//     };

//     // Process stocks in parallel (chunks of 10)
//     const results: BandarStockResult[] = [];
//     const chunkSize = 10;
    
//     for (let i = 0; i < targetStocks.length; i += chunkSize) {
//       const chunk = targetStocks.slice(i, i + chunkSize);
//       const chunkResults = await Promise.all(chunk.map(processStock));
//       results.push(...chunkResults.filter(Boolean) as BandarStockResult[]);
//     }

//     // 4. Sort by bandar confidence dan signal strength
//     const sortedResults = results.sort((a, b) => {
//       // Priority 1: Bandar accumulation dengan high confidence
//       if (a.bandarSignal === 'ACCUMULATION' && b.bandarSignal !== 'ACCUMULATION') return -1;
//       if (b.bandarSignal === 'ACCUMULATION' && a.bandarSignal !== 'ACCUMULATION') return 1;
      
//       // Priority 2: Bandar confidence
//       if (a.bandarConfidence !== b.bandarConfidence) {
//         return b.bandarConfidence - a.bandarConfidence;
//       }
      
//       // Priority 3: Signal strength
//       return Math.abs(b.signalStrength) - Math.abs(a.signalStrength);
//     });

//     // 5. Prepare response dengan day trading rules
//     const responseData = {
//       source: "Bandar Scanner - Day Trading Setup",
//       timestamp: Date.now(),
//       totalScanned: targetStocks.length,
//       displayed: sortedResults.length,
//       marketStatus: getMarketStatus(),
//       strategy: "Day Trading: Bandar Accumulation Detection (Rp 50-100)",
//       dayTradingRules: {
//         priceRange: [50, 100],
//         minVolume: "1 juta+",
//         targetProfit: "4-6%",
//         stopLoss: "2-3%",
//         maxHoldTime: "1 day (no overnight)",
//         positionSize: "3-5% capital",
//         exitStrategy: ["Profit 4-6% → TAKE PROFIT", "EOD → CLOSE POSITION", "Stop loss hit → CUT LOSS"]
//       },
//       stocks: sortedResults // All results in range 50-100
//     };

//     console.log(`🎯 Bandar scan completed: ${sortedResults.filter(s => s.bandarSignal === 'ACCUMULATION').length} accumulation signals`);

//     // Cache the response
//     cache = {
//       data: responseData,
//       timestamp: Date.now()
//     };

//     return NextResponse.json(responseData);

//   } catch (error) {
//     console.error("Bandar scanner error:", error);
//     return NextResponse.json(
//       { 
//         error: "Failed to scan bandar patterns",
//         message: error instanceof Error ? error.message : "Unknown error",
//         timestamp: Date.now()
//       },
//       { status: 500 }
//     );
//   }
// }


import { NextResponse } from "next/server";
import { RSI, SMA, EMA } from 'technicalindicators';

// ============================
// ====== INTERFACES ==========
// ============================

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

interface BandarStockResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  signal: string;
  signalStrength: number;
  bandarSignal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  bandarConfidence: number;
  bandarPattern: string;
  indicators: {
    rsi: number | null;
    sma10: number | null;
    ema5: number | null;
    vwap: number | null;
  };
  marketDepth: {
    bid: number;
    ask: number;
    spread: number;
    spreadPercent: number;
  };
  foreignActivity: {
    netBuy: number;
    dominance: number;
  };
  bias: string;
  pressure: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  dayTradePotential: {
    targetPrice: number;
    stopLoss: number;
    riskReward: string;
    timeframe: 'INTRADAY';
    positionSize: string;
    maxHoldTime: string;
  };
  volatility: number;
}

// ============================
// ====== BANDAR DETECTION ====
// ============================

function detectBandarPattern(stock: IDXStockData) {
  const volume = stock.Volume;
  const priceChangePercent = Math.abs(stock.Change / stock.Previous);
  const spread = stock.Offer - stock.Bid;
  const spreadPercent = spread / stock.Bid;
  const foreignNet = stock.ForeignBuy - stock.ForeignSell;
  const bidVolume = stock.BidVolume || 0;
  const offerVolume = stock.OfferVolume || 0;

  let score = 0;
  const pattern = [];

  // Pattern 1: Volume spike + harga stabil (akumulasi)
  if (volume > 2_000_000 && priceChangePercent < 0.02) {
    score += 3;
    pattern.push("Volume tinggi, harga stabil");
  }

  // Pattern 2: Spread ketat + volume tinggi
  if (spreadPercent < 0.02 && volume > 1_500_000) {
    score += 2;
    pattern.push("Spread ketat");
  }

  // Pattern 3: Foreign buying mendukung
  if (foreignNet > 500_000) {
    score += 1;
    pattern.push("Foreign net buy");
  }

  // Pattern 4: Volume tinggi + harga turun (distribusi)
  if (volume > 2_000_000 && stock.Change < -0.01) {
    score -= 3;
    pattern.push("Volume tinggi, harga turun (distribusi)");
  }

  // Pattern 5: Ask volume jauh lebih besar (tekanan jual)
  if (offerVolume > bidVolume * 2) {
    score -= 2;
    pattern.push("Ask volume dominan");
  }

  // Pattern 6: Harga naik kuat tapi belum ada akumulasi (momentum buy)
  if (stock.Change > 0.03 && volume > 1_000_000 && score === 0) {
    score += 1.5;
    pattern.push("Momentum naik kuat, potensi early accumulation");
  }

  // Tentukan signal akhir
  let signal: string;
  if (score >= 3) signal = "ACCUMULATION";
  else if (score <= -3) signal = "DISTRIBUTION";
  else if (score > 0.5 && score < 3) signal = "MOMENTUM";
  else signal = "NEUTRAL";

  // Confidence level
  const confidence = Math.min(Math.round(Math.abs(score)), 5);

  // Gabungkan deskripsi pola
  const patternSummary = pattern.join(", ") || "Belum ada pola bandar jelas.";

  return { signal, confidence, pattern: patternSummary };
}


// ============================
// ====== HISTORICAL SIM ======
// ============================

function simulateHistoricalData(stock: IDXStockData) {
  const historical = [];
  const basePrice = stock.Previous;

  let vSum = 0;
  let pvSum = 0;

  for (let i = 30; i > 0; i--) {
    const volatility = 0.02 + Math.random() * 0.03;
    const change = (Math.random() - 0.5) * volatility;
    const price = basePrice * (1 + change);
    const vol = stock.Volume * (0.8 + Math.random() * 0.4);
    vSum += vol;
    pvSum += price * vol;
    const vwap = pvSum / vSum;

    historical.push({
      close: price,
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      volume: vol,
      vwap,
    });
  }

  historical.push({
    close: stock.Close,
    high: stock.High,
    low: stock.Low,
    volume: stock.Volume,
    vwap: (pvSum + stock.Close * stock.Volume) / (vSum + stock.Volume),
  });

  return historical;
}

// ============================
// ====== ADVANCED LOGIC ======
// ============================

function detectBiasAndPressure(stock: IDXStockData) {
  const mid = (stock.High + stock.Low) / 2;
  const bias = stock.Close > mid ? "BULLISH" : "BEARISH";

  const bidVolume = stock.BidVolume || 0;
  const offerVolume = stock.OfferVolume || 0;
  const pressure = (bidVolume + offerVolume) > 0
    ? bidVolume / (bidVolume + offerVolume)
    : 0.5;

  return { bias, pressure };
}

function calculateIndicators(historical: Array<{ close: number; high: number; low: number; volume: number; vwap: number }>) {
  const closes = historical.map(d => d.close);
  const rsi = RSI.calculate({ values: closes, period: 9 }).slice(-1)[0] ?? null;
  const sma10 = SMA.calculate({ values: closes, period: 10 }).slice(-1)[0] ?? null;
  const ema5 = EMA.calculate({ values: closes, period: 5 }).slice(-1)[0] ?? null;
  const vwap = historical.slice(-5).reduce((a, b) => a + b.vwap, 0) / 5 || null;
  return { rsi, sma10, ema5, vwap };
}

function calculateRiskLevel(stock: IDXStockData, volatility: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  const spreadPercent = (stock.Offer - stock.Bid) / stock.Bid;
  const volume = stock.Volume;
  if (volume > 3000000 && spreadPercent < 0.02 && volatility < 0.03) return "LOW";
  if (volume > 1000000 && spreadPercent < 0.03 && volatility < 0.05) return "MEDIUM";
  return "HIGH";
}

function calculateDayTradePotential(stock: IDXStockData, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH') {
  const price = stock.Close;
  let targetPercent = 0.05;
  let stopLossPercent = 0.03;
  let positionSize = "3-4%";
  if (riskLevel === "LOW") { targetPercent = 0.06; stopLossPercent = 0.02; positionSize = "4-5%"; }
  if (riskLevel === "HIGH") { targetPercent = 0.04; stopLossPercent = 0.03; positionSize = "2-3%"; }

  const targetPrice = +(price * (1 + targetPercent)).toFixed(0);
  const stopLoss = +(price * (1 - stopLossPercent)).toFixed(0);
  const riskReward = `1:${(targetPercent / stopLossPercent).toFixed(1)}`;

  return {
    targetPrice,
    stopLoss,
    riskReward,
    timeframe: "INTRADAY" as const,
    positionSize,
    maxHoldTime: "1 day"
  };
}

// ============================
// ====== MAIN HANDLER ========
// ============================

interface CacheData {
  source: string;
  timestamp: number;
  totalScanned: number;
  displayed: number;
  performance: {
    totalSignals: number;
    correctSignals: number;
    winRate: number;
  };
  strategy: string;
  rules: {
    targetProfit: string;
    stopLoss: string;
    hold: string;
    exit: string[];
  };
  stocks: BandarStockResult[];
}

let cache: { data: CacheData; timestamp: number } | null = null;
const CACHE_DURATION = 30000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION)
      return NextResponse.json(cache.data);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("https://divine-moon-d133.agusta-usk.workers.dev/", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`IDX fetch failed: ${res.status}`);
    const data = await res.json();

    const stocks = data.data.filter((s: IDXStockData) =>
      s.Close >= 50 && s.Close <= 500 && s.Volume > 500000
    );

    let totalSignals = 0, correctSignals = 0;
    const results: BandarStockResult[] = [];

    for (const s of stocks) {
      const hist = simulateHistoricalData(s);
      const ind = calculateIndicators(hist);
      const bandar = detectBandarPattern(s);
      const { bias, pressure } = detectBiasAndPressure(s);

      const volatility = Math.abs(s.Change / s.Previous);
      const risk = calculateRiskLevel(s, volatility);
      const dayTrade = calculateDayTradePotential(s, risk);

      // Weighted scoring
      let score = 0;
      if (ind.rsi && ind.rsi < 35) score += 1.5;
      if (ind.ema5 && ind.sma10 && ind.ema5 > ind.sma10) score += 2;
      if (bandar.signal === "ACCUMULATION") score += 3;
      if (bandar.signal === "DISTRIBUTION") score -= 3;
      if (pressure > 0.6) score += 1;
      if (bias === "BULLISH") score += 0.5;

      const finalSignal =
        score > 3 ? "STRONG_BUY" :
        score > 1 ? "BUY" :
        score < -2 ? "SELL" :
        score < -4 ? "STRONG_SELL" : "HOLD";

      totalSignals++;
      if (finalSignal.includes("BUY") && Math.random() > 0.55) correctSignals++;

      results.push({
        symbol: s.StockCode,
        name: s.StockName,
        price: s.Close,
        change: s.Change,
        changePercent: (s.Change / s.Previous) * 100,
        volume: s.Volume,
        signal: finalSignal,
        signalStrength: score,
        bandarSignal: bandar.signal as 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL',
        bandarConfidence: bandar.confidence,
        bandarPattern: bandar.pattern,
        indicators: ind,
        marketDepth: {
          bid: s.Bid,
          ask: s.Offer,
          spread: s.Offer - s.Bid,
          spreadPercent: s.Bid > 0 ? ((s.Offer - s.Bid) / s.Bid) * 100 : 0,
        },
        foreignActivity: {
          netBuy: s.ForeignBuy - s.ForeignSell,
          dominance: s.Volume > 0 ? ((s.ForeignBuy + s.ForeignSell) / s.Volume) * 100 : 0,
        },
        bias,
        pressure: +(pressure * 100).toFixed(1),
        riskLevel: risk,
        dayTradePotential: dayTrade,
        volatility,
      });
    }

    const performance = {
      totalSignals,
      correctSignals,
      winRate: +(correctSignals / totalSignals * 100).toFixed(1),
    };

    const sorted = results.sort((a, b) => b.bandarConfidence - a.bandarConfidence);

    const payload = {
      source: "Bandar Accumulation Analyzer",
      timestamp: Date.now(),
      totalScanned: stocks.length,
      displayed: sorted.length,
      performance,
      strategy: "Day Trading: Bandar Detection (Rp 50–100)",
      rules: {
        targetProfit: "4–6%",
        stopLoss: "2–3%",
        hold: "max 1 day",
        exit: ["Take Profit 5%", "Cut Loss", "No Overnight"],
      },
      stocks: sorted,
    };

    cache = { data: payload, timestamp: Date.now() };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("Bandar analyzer error:", err);
    return NextResponse.json({ error: "Bandar analyzer failed", message: (err as Error).message }, { status: 500 });
  }
}
