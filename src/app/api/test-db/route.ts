import { NextResponse } from 'next/server';
import connection from '@/lib/db';

export async function GET() {
  try {
    const db = await connection;
    
    // Test basic connection
    const [result] = await db.execute('SELECT 1 as test');
    
    // Test database info
    const [dbInfo] = await db.execute('SELECT DATABASE() as current_db, VERSION() as version');
    
    // List tables
    const [tables] = await db.execute('SHOW TABLES');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      connection: {
        test: result,
        database: dbInfo,
        tables: tables,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Database connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}