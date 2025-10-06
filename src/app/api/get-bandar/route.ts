import { NextResponse } from 'next/server';
import { getLatestBandarData } from '@/lib/bandar-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const symbol = searchParams.get('symbol');

    const data = await getLatestBandarData(limit);
    
    // Cast to array and filter by symbol if provided
    const dataArray = Array.isArray(data) ? data : [];
    const filteredData = symbol 
      ? dataArray.filter((row: { symbol: string }) => row.symbol === symbol.toUpperCase())
      : dataArray;

    return NextResponse.json({
      success: true,
      count: Array.isArray(filteredData) ? filteredData.length : 0,
      data: filteredData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get bandar data error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get bandar data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}