import { NextResponse } from 'next/server';
import connection from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

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
        stocks: (stocksResult as ResultSetHeader).affectedRows,
        signals: (signalsResult as ResultSetHeader).affectedRows,
        indicators: (indicatorsResult as ResultSetHeader).affectedRows
      }
    });
  } catch {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}