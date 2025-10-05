import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get("user-agent") || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
    
    const response = await fetch("https://www.idx.co.id/primary/TradingSummary/GetStockSummary", {
      headers: {
        "User-Agent": userAgent,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": "https://www.idx.co.id/data-pasar/ringkasan-perdagangan/ringkasan",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    
    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}