import yahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const days = parseInt(searchParams.get('days') || '30');

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    const historical = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d'
    });

    const chartData = historical.map(h => ({
      date: h.date.toISOString().split('T')[0],
      open: h.open,
      high: h.high,
      low: h.low,
      close: h.close,
      volume: h.volume
    }));

    return NextResponse.json({
      symbol,
      days,
      data: chartData
    });
  } catch (error) {
    console.error("Historical API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}