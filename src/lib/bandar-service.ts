import connection from './db';
import { RowDataPacket } from 'mysql2';

export interface BandarData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  signal: string;
  signalStrength: number;
  bandarSignal: string;
  bandarConfidence: number;
  bandarPattern: string;
  indicators: {
    rsi: number | null;
    sma10: number | null;
    ema5: number | null;
    vwap?: number | null;
  };
}

export interface BandarQueryResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  signal: string;
  signalStrength: number;
  bandarSignal: string;
  bandarConfidence: number;
  bandarPattern: string;
  rsi: number | null;
  sma10: number | null;
  ema5: number | null;
  vwap: number | null;
  timestamp: Date;
}

export async function saveBandarData(data: BandarData[]) {
  try {
    const db = await connection;
    
    for (const stock of data) {
      // Save stock data
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        `INSERT INTO stocks (symbol, name, price, change_amount, change_percent, volume, timestamp, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [stock.symbol, stock.name, stock.price, stock.change, stock.changePercent, stock.volume, now, now]
      );

      // Save bandar signals
      await db.execute(
        `INSERT INTO bandar_signals (symbol, signals, signal_strength, bandar_signal, bandar_confidence, bandar_pattern, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [stock.symbol, stock.signal, stock.signalStrength, stock.bandarSignal, stock.bandarConfidence, stock.bandarPattern, now]
      );

      // Save technical indicators
      await db.execute(
        `INSERT INTO technical_indicators (symbol, rsi, sma10, ema5, vwap, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stock.symbol, stock.indicators.rsi, stock.indicators.sma10, stock.indicators.ema5, stock.indicators.vwap, now]
      );
    }

    return { success: true, count: data.length };
  } catch (error) {
    console.error('Error saving bandar data:', error);
    throw error;
  }
}

export async function getLatestBandarData(limit = 100): Promise<BandarQueryResult[]> {
  try {
    const db = await connection;
    
    const [rows] = await db.execute(`
      SELECT 
        s.symbol, s.name, s.price, s.change_amount as change, s.change_percent as changePercent, s.volume,
        bs.signal, bs.signal_strength as signalStrength, bs.bandar_signal as bandarSignal, 
        bs.bandar_confidence as bandarConfidence, bs.bandar_pattern as bandarPattern,
        ti.rsi, ti.sma10, ti.ema5, ti.vwap,
        s.timestamp
      FROM stocks s
      LEFT JOIN bandar_signals bs ON s.symbol = bs.symbol AND s.timestamp = bs.timestamp
      LEFT JOIN technical_indicators ti ON s.symbol = ti.symbol AND s.timestamp = ti.timestamp
      ORDER BY s.timestamp DESC
      LIMIT ?
    `, [limit]);

    return Array.isArray(rows) ? (rows as RowDataPacket[]) as BandarQueryResult[] : [];
  } catch (error) {
    console.error('Error fetching bandar data:', error);
    throw error;
  }
}