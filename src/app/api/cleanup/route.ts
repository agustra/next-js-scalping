import { NextResponse } from 'next/server';
import connection from '@/lib/db';

export async function POST() {
  try {
    const db = await connection;
    
    // Keep only last 7 days
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });
    
    const [stocksResult] = await db.execute('DELETE FROM stocks WHERE timestamp < ?', [cutoffTime]);
    const [signalsResult] = await db.execute('DELETE FROM bandar_signals WHERE timestamp < ?', [cutoffTime]);
    const [indicatorsResult] = await db.execute('DELETE FROM technical_indicators WHERE timestamp < ?', [cutoffTime]);
    
    return NextResponse.json({
      success: true,
      deleted: {
        stocks: (stocksResult as any).affectedRows,
        signals: (signalsResult as any).affectedRows,
        indicators: (indicatorsResult as any).affectedRows
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}