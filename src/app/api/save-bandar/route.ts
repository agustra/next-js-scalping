import { NextResponse } from 'next/server';
import { saveBandarData } from '@/lib/bandar-service';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.stocks || !Array.isArray(data.stocks)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected stocks array.' },
        { status: 400 }
      );
    }

    const result = await saveBandarData(data.stocks);
    
    return NextResponse.json({
      success: true,
      message: `Saved ${result.count} stock records`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Save bandar data error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save bandar data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}