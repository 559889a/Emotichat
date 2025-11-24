import { NextRequest, NextResponse } from 'next/server';
import { activatePreset, getActivePreset } from '@/lib/storage/config';

/**
 * POST /api/presets/active
 * 激活预设（全局唯一）
 */
export async function POST(request: NextRequest) {
  try {
    const { presetId } = await request.json();

    if (!presetId) {
      return NextResponse.json(
        { error: 'presetId is required' },
        { status: 400 }
      );
    }

    await activatePreset(presetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error activating preset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate preset' },
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