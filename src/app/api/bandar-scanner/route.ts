import { NextResponse } from "next/server";
import { RSI, SMA, EMA } from 'technicalindicators';

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
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  dayTradePotential: {
    targetPrice: number;
    stopLoss: number;
    riskReward: string;
    timeframe: 'INTRADAY';
    positionSize: string;
    maxHoldTime: string;
  };
}

// ✅ SIMPLE BANDAR DETECTION
function detectBandarPattern(stock: IDXStockData): {
  signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  confidence: number;
  pattern: string;
} {
  const volume = stock.Volume;
  const priceChangePercent = Math.abs(stock.Change / stock.Previous);
  const spread = stock.Offer - stock.Bid;
  const spreadPercent = spread / stock.Bid;
  const foreignNet = stock.ForeignBuy - stock.ForeignSell;

  let score = 0;
  let pattern = "";

  // Pattern 1: Volume spike + harga sideways (akumulasi)
  if (volume > 2000000 && priceChangePercent < 0.02) {
    score += 3;
    pattern += "Volume tinggi, harga stabil ";
  }

  // Pattern 2: Spread ketat + volume tinggi
  if (spreadPercent < 0.02 && volume > 1500000) {
    score += 2;
    pattern += "Spread ketat ";
  }

  // Pattern 3: Foreign buying mendukung
  if (foreignNet > 500000) {
    score += 1;
    pattern += "Foreign net buy ";
  }

  // Pattern 4: Volume tinggi + harga turun (distribusi)
  if (volume > 2000000 && stock.Change < -0.01) {
    score -= 3;
    pattern = "Volume tinggi, harga turun (distribusi)";
  }

  // Pattern 5: Ask volume jauh lebih besar
  if (stock.OfferVolume > stock.BidVolume * 2) {
    score -= 2;
    pattern += "Ask volume dominan ";
  }

  if (score >= 3) {
    return { signal: 'ACCUMULATION', confidence: Math.min(score, 5), pattern };
  } else if (score <= -3) {
    return { signal: 'DISTRIBUTION', confidence: Math.min(Math.abs(score), 5), pattern };
  } else {
    return { signal: 'NEUTRAL', confidence: 0, pattern: "Tidak ada pattern jelas" };
  }
}

// ✅ GENERATE SIGNAL UNTUK RANGE 50-100
function generateBandarAwareSignal(
  stock: IDXStockData,
  rsi: number | null,
  sma: number | null,
  ema: number | null
): { signal: string; strength: number } {
  const price = stock.Close;
  const volume = stock.Volume;
  const bandarAnalysis = detectBandarPattern(stock);

  // Auto-reject di luar range strategi
  if (price < 50 || price > 100) {
    return { signal: 'HOLD', strength: 0 };
  }

  if (!rsi || !sma || !ema) {
    return { signal: 'HOLD', strength: 0 };
  }

  let strength = 0;

  // Technical signals
  if (rsi < 35) strength += 2;
  else if (rsi < 45) strength += 1;
  else if (rsi > 65) strength -= 2;
  else if (rsi > 55) strength -= 1;

  const emaAboveSma = ema > sma;
  const priceAboveSma = price > sma;

  if (emaAboveSma && priceAboveSma) strength += 2;
  else if (emaAboveSma) strength += 1;
  else if (!emaAboveSma && !priceAboveSma) strength -= 2;
  else if (!emaAboveSma) strength -= 1;

  if (volume > 1000000) strength += 1;

  // ✅ BANDAR BOOST - PALING PENTING!
  if (bandarAnalysis.signal === 'ACCUMULATION') {
    strength += bandarAnalysis.confidence; // Boost berdasarkan confidence
  } else if (bandarAnalysis.signal === 'DISTRIBUTION') {
    strength -= bandarAnalysis.confidence; // Penalty untuk distribusi
  }

  // Determine final signal
  let signal = 'HOLD';
  if (strength >= 4) signal = 'STRONG_BUY';
  else if (strength >= 2) signal = 'BUY';
  else if (strength <= -4) signal = 'STRONG_SELL';
  else if (strength <= -2) signal = 'SELL';

  return { signal, strength: Math.max(-5, Math.min(5, strength)) };
}

// ✅ SIMULATE HISTORICAL DATA
function simulateHistoricalData(stock: IDXStockData): Array<{ close: number; high: number; low: number }> {
  const historical = [];
  const basePrice = stock.Previous;
  
  for (let i = 30; i > 0; i--) {
    const volatility = 0.02 + (Math.random() * 0.03);
    const change = (Math.random() - 0.5) * volatility;
    const price = basePrice * (1 + change);
    
    historical.push({
      close: price,
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02)
    });
  }
  
  historical.push({
    close: stock.Close,
    high: stock.High,
    low: stock.Low
  });
  
  return historical;
}

// ✅ CALCULATE RISK LEVEL
function calculateRiskLevel(stock: IDXStockData, volatility: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  const volume = stock.Volume;
  const spreadPercent = (stock.Offer - stock.Bid) / stock.Bid;

  if (volume > 3000000 && spreadPercent < 0.02 && volatility < 0.03) {
    return 'LOW';
  } else if (volume > 1000000 && spreadPercent < 0.03 && volatility < 0.05) {
    return 'MEDIUM';
  } else {
    return 'HIGH';
  }
}

// ✅ DAY TRADING POTENTIAL CALCULATOR
function calculateDayTradePotential(stock: IDXStockData, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH') {
  const currentPrice = stock.Close;
  
  // Target berdasarkan risk level
  let targetPercent = 0.05; // Default 5%
  let stopLossPercent = 0.03; // Default 3%
  let positionSize = '3-4%';
  
  if (riskLevel === 'LOW') {
    targetPercent = 0.06; // 6% target untuk low risk
    stopLossPercent = 0.02; // 2% stop loss
    positionSize = '4-5%';
  } else if (riskLevel === 'HIGH') {
    targetPercent = 0.04; // 4% target untuk high risk
    stopLossPercent = 0.03; // 3% stop loss
    positionSize = '2-3%';
  }
  
  const targetPrice = Number((currentPrice * (1 + targetPercent)).toFixed(0));
  const stopLoss = Number((currentPrice * (1 - stopLossPercent)).toFixed(0));
  const riskRewardRatio = (targetPercent / stopLossPercent).toFixed(1);
  
  return {
    targetPrice,
    stopLoss,
    riskReward: `1:${riskRewardRatio}`,
    timeframe: 'INTRADAY' as const,
    positionSize,
    maxHoldTime: '1 day'
  };
}

export async function GET() {
  try {
    console.log('🎯 Scanning for Bandar Patterns...');
    
    // 1. Fetch data from IDX
    const idxResponse = await fetch('https://divine-moon-d133.agusta-usk.workers.dev/');
    
    if (!idxResponse.ok) {
      throw new Error(`Failed to fetch IDX data: ${idxResponse.status}`);
    }

    const idxData = await idxResponse.json();

    if (!idxData?.data || !Array.isArray(idxData.data)) {
      throw new Error("Invalid IDX data structure");
    }

    // 2. Filter untuk range 50-100 dengan volume decent
    const targetStocks = idxData.data.filter((stock: IDXStockData) => {
      return (
        stock.Close >= 50 &&
        stock.Close <= 100 &&
        stock.Volume > 500000 &&
        stock.StockCode &&
        stock.Close > 0
      );
    });

    console.log(`📊 Found ${targetStocks.length} stocks in range 50-100`);

    // 3. Process stocks dengan bandar detection
    const results: BandarStockResult[] = [];

    for (const stock of targetStocks.slice(0, 100)) { // Process max 100 stocks
      try {
        const historicalData = simulateHistoricalData(stock);
        const closes = historicalData.map(h => h.close);
        
        // Calculate basic indicators
        const rsi = RSI.calculate({ values: closes, period: 9 });
        const sma10 = SMA.calculate({ values: closes, period: 10 });
        const ema5 = EMA.calculate({ values: closes, period: 5 });
        
        const currentRSI = rsi.length > 0 ? rsi[rsi.length - 1] : null;
        const currentSMA = sma10.length > 0 ? sma10[sma10.length - 1] : null;
        const currentEMA = ema5.length > 0 ? ema5[ema5.length - 1] : null;

        // Bandar analysis
        const bandarAnalysis = detectBandarPattern(stock);
        
        // Generate signal
        const { signal, strength } = generateBandarAwareSignal(stock, currentRSI, currentSMA, currentEMA);
        
        // Calculate risk
        const volatility = Math.random() * 0.06; // Simplified volatility
        const riskLevel = calculateRiskLevel(stock, volatility);
        
        // Calculate day trade potential
        const dayTradePotential = calculateDayTradePotential(stock, riskLevel);

        results.push({
          symbol: stock.StockCode,
          name: stock.StockName,
          price: stock.Close,
          change: stock.Change,
          changePercent: stock.Previous > 0 ? (stock.Change / stock.Previous) * 100 : 0,
          volume: stock.Volume,
          signal,
          signalStrength: strength,
          bandarSignal: bandarAnalysis.signal,
          bandarConfidence: bandarAnalysis.confidence,
          bandarPattern: bandarAnalysis.pattern,
          indicators: {
            rsi: currentRSI,
            sma10: currentSMA,
            ema5: currentEMA
          },
          marketDepth: {
            bid: stock.Bid,
            ask: stock.Offer,
            spread: stock.Offer - stock.Bid,
            spreadPercent: stock.Bid > 0 ? ((stock.Offer - stock.Bid) / stock.Bid) * 100 : 0
          },
          foreignActivity: {
            netBuy: stock.ForeignBuy - stock.ForeignSell,
            dominance: stock.Volume > 0 ? 
              ((stock.ForeignBuy + stock.ForeignSell) / stock.Volume) * 100 : 0
          },
          riskLevel,
          dayTradePotential
        });

      } catch (error) {
        console.error(`Failed to process ${stock.StockCode}:`, error);
      }
    }

    // 4. Sort by bandar confidence dan signal strength
    const sortedResults = results.sort((a, b) => {
      // Priority 1: Bandar accumulation dengan high confidence
      if (a.bandarSignal === 'ACCUMULATION' && b.bandarSignal !== 'ACCUMULATION') return -1;
      if (b.bandarSignal === 'ACCUMULATION' && a.bandarSignal !== 'ACCUMULATION') return 1;
      
      // Priority 2: Bandar confidence
      if (a.bandarConfidence !== b.bandarConfidence) {
        return b.bandarConfidence - a.bandarConfidence;
      }
      
      // Priority 3: Signal strength
      return Math.abs(b.signalStrength) - Math.abs(a.signalStrength);
    });

    // 5. Prepare response dengan day trading rules
    const responseData = {
      source: "Bandar Scanner - Day Trading Setup",
      timestamp: Date.now(),
      totalScanned: targetStocks.length,
      displayed: sortedResults.length,
      marketStatus: "CLOSED",
      strategy: "Day Trading: Bandar Accumulation Detection (Rp 50-100)",
      dayTradingRules: {
        priceRange: [50, 100],
        minVolume: "1 juta+",
        targetProfit: "4-6%",
        stopLoss: "2-3%",
        maxHoldTime: "1 day (no overnight)",
        positionSize: "3-5% capital",
        exitStrategy: ["Profit 4-6% → TAKE PROFIT", "EOD → CLOSE POSITION", "Stop loss hit → CUT LOSS"]
      },
      stocks: sortedResults.slice(0, 50) // Top 50 results
    };

    console.log(`🎯 Bandar scan completed: ${sortedResults.filter(s => s.bandarSignal === 'ACCUMULATION').length} accumulation signals`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Bandar scanner error:", error);
    return NextResponse.json(
      { 
        error: "Failed to scan bandar patterns",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}