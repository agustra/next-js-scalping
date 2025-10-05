// import puppeteer from "puppeteer";

// export async function GET() {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();
//   await page.goto("https://www.idx.co.id/data-pasar/ringkasan-perdagangan/ringkasan", {
//     waitUntil: "networkidle0",
//   });

//   // Ambil data dari endpoint internal setelah cookie valid
//   const data = await page.evaluate(async () => {
//     const res = await fetch("/primary/TradingSummary/GetStockSummary", {
//       headers: { "X-Requested-With": "XMLHttpRequest" },
//     });
//     return await res.json();
//   });

//   await browser.close();
//   return Response.json(data);
// }

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // const userAgent = request.headers.get("user-agent") || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
    
    const response = await fetch("https://www.idx.co.id/primary/TradingSummary/GetStockSummary", {
      headers: {
        // "User-Agent": userAgent,
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
