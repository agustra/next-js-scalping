import yahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";
import { RSI, SMA } from 'technicalindicators';

interface BacktestParams {
  symbol: string;
  days: number;
  strategy: 'rsi' | 'ma_cross' | 'combined';
  initialCapital: number;
}

interface Trade {
  date: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  signal: string;
}

export async function POST(request: Request) {
  try {
    const params: BacktestParams = await request.json();
    const { symbol, days = 90, strategy = 'rsi', initialCapital = 100000000 } = params;

    // Get historical data
    const historical = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d'
    });

    if (historical.length < 30) {
      return NextResponse.json({ error: "Insufficient data" }, { status: 400 });
    }

    // Calculate indicators
    const closes = historical.map(h => h.close);
    const rsi = RSI.calculate({ values: closes, period: 14 });
    const sma20 = SMA.calculate({ values: closes, period: 20 });
    const sma50 = SMA.calculate({ values: closes, period: 50 });

    // Backtest simulation
    const trades: Trade[] = [];
    let capital = initialCapital;
    let shares = 0;
    let position = 'CASH'; // 'CASH' or 'STOCK'

    for (let i = 50; i < historical.length; i++) {
      const currentPrice = historical[i].close;
      const currentRSI = rsi[i - 36] || 50; // Adjust index for RSI calculation
      const currentSMA20 = sma20[i - 19] || currentPrice;
      const currentSMA50 = sma50[i - 49] || currentPrice;
      
      let signal = '';
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

      // Strategy logic
      switch (strategy) {
        case 'rsi':
          if (currentRSI < 30 && position === 'CASH') {
            action = 'BUY';
            signal = `RSI Oversold (${currentRSI.toFixed(1)})`;
          } else if (currentRSI > 70 && position === 'STOCK') {
            action = 'SELL';
            signal = `RSI Overbought (${currentRSI.toFixed(1)})`;
          }
          break;

        case 'ma_cross':
          if (currentSMA20 > currentSMA50 && position === 'CASH') {
            action = 'BUY';
            signal = 'Golden Cross';
          } else if (currentSMA20 < currentSMA50 && position === 'STOCK') {
            action = 'SELL';
            signal = 'Death Cross';
          }
          break;

        case 'combined':
          if (currentRSI < 35 && currentSMA20 > currentSMA50 && position === 'CASH') {
            action = 'BUY';
            signal = `Combined Buy (RSI: ${currentRSI.toFixed(1)})`;
          } else if ((currentRSI > 65 || currentSMA20 < currentSMA50) && position === 'STOCK') {
            action = 'SELL';
            signal = `Combined Sell (RSI: ${currentRSI.toFixed(1)})`;
          }
          break;
      }

      // Execute trades
      if (action === 'BUY' && capital > currentPrice * 100) {
        const quantity = Math.floor(capital / (currentPrice * 100)) * 100; // Round lot
        shares = quantity;
        capital -= quantity * currentPrice;
        position = 'STOCK';
        
        trades.push({
          date: historical[i].date.toISOString().split('T')[0],
          type: 'BUY',
          price: currentPrice,
          quantity,
          signal
        });
      } else if (action === 'SELL' && shares > 0) {
        capital += shares * currentPrice;
        
        trades.push({
          date: historical[i].date.toISOString().split('T')[0],
          type: 'SELL',
          price: currentPrice,
          quantity: shares,
          signal
        });
        
        shares = 0;
        position = 'CASH';
      }
    }

    // Final portfolio value
    const finalPrice = historical[historical.length - 1].close;
    const finalValue = capital + (shares * finalPrice);
    const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
    const buyHoldReturn = ((finalPrice - historical[50].close) / historical[50].close) * 100;

    // Performance metrics
    const winningTrades = trades.filter((trade, i) => {
      if (trade.type === 'SELL' && i > 0) {
        const buyTrade = trades[i - 1];
        return trade.price > buyTrade.price;
      }
      return false;
    }).length;

    const totalTrades = trades.filter(t => t.type === 'SELL').length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return NextResponse.json({
      symbol,
      strategy,
      period: `${days} days`,
      initialCapital,
      finalValue,
      totalReturn: totalReturn.toFixed(2),
      buyHoldReturn: buyHoldReturn.toFixed(2),
      tradesCount: trades.length,
      winRate: winRate.toFixed(1),
      trades: trades,
      performance: {
        alpha: (totalReturn - buyHoldReturn).toFixed(2),
        maxDrawdown: calculateMaxDrawdown(trades, initialCapital).toFixed(2)
      }
    });

  } catch (error) {
    console.error("Backtest error:", error);
    return NextResponse.json(
      { error: "Backtest failed" },
      { status: 500 }
    );
  }
}

function calculateMaxDrawdown(trades: Trade[], initialCapital: number): number {
  let peak = initialCapital;
  let maxDrawdown = 0;
  let currentValue = initialCapital;

  for (const trade of trades) {
    if (trade.type === 'SELL') {
      currentValue = trade.price * trade.quantity;
      if (currentValue > peak) peak = currentValue;
      const drawdown = ((peak - currentValue) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}