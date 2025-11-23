import { NextRequest, NextResponse } from 'next/server';
import { setActivePresetId, getActivePreset } from '@/lib/storage/config';

/**
 * POST /api/presets/active
 * 设置活动预设
 */
export async function POST(request: NextRequest) {
  try {
    const { presetId } = await request.json();
    
    await setActivePresetId(presetId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting active preset:', error);
    return NextResponse.json(
      { error: 'Failed to set active preset' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/presets/active
 * 获取当前活动预设
 */
export async function GET() {
  try {
    const preset = await getActivePreset();
    
    return NextResponse.json({ preset });
  } catch (error) {
    console.error('Error getting active preset:', error);
    return NextResponse.json(
      { error: 'Failed to get active preset' },
      { status: 500 }
    );
  }
}