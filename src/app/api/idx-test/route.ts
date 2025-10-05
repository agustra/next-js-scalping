import puppeteer from "puppeteer";

export async function GET() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.idx.co.id/data-pasar/ringkasan-perdagangan/ringkasan", {
    waitUntil: "networkidle0",
  });

  // Ambil data dari endpoint internal setelah cookie valid
  const data = await page.evaluate(async () => {
    const res = await fetch("/primary/TradingSummary/GetStockSummary", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    return await res.json();
  });

  await browser.close();
  return Response.json(data);
}
