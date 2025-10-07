import { NextResponse } from 'next/server';
import connection from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface CountResult extends RowDataPacket {
  count: number;
}

export async function GET() {
  // Debug environment variables
  const envDebug = {
    MYSQL_URL: process.env.MYSQL_URL ? 'SET' : 'NOT_SET',
    MYSQLHOST: process.env.MYSQLHOST || 'NOT_SET',
    MYSQLPORT: process.env.MYSQLPORT || 'NOT_SET',
    MYSQLUSER: process.env.MYSQLUSER || 'NOT_SET',
    MYSQLDATABASE: process.env.MYSQLDATABASE || 'NOT_SET',
    MYSQLPASSWORD: process.env.MYSQLPASSWORD ? 'SET' : 'NOT_SET',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT_SET'
  };

  try {
    const db = await connection;
    
    // Test basic connection
    await db.execute('SELECT 1 as test');
    
    // Test database access
    const [tables] = await db.execute('SHOW TABLES');
    
    // Test data count
    const [stockCount] = await db.execute('SELECT COUNT(*) as count FROM stocks');
    const [signalCount] = await db.execute('SELECT COUNT(*) as count FROM bandar_signals');
    
    return NextResponse.json({
      status: 'success',
      connection: 'Railway MySQL connected',
      database: 'railway',
      tables: (tables as unknown[]).length,
      data: {
        stocks: (stockCount as CountResult[])[0]?.count || 0,
        signals: (signalCount as CountResult[])[0]?.count || 0
      },
      env: envDebug,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      env: envDebug,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}