import { NextRequest, NextResponse } from 'next/server';
import {
  loadAllPresets,
  savePreset,
  getActivePresetId,
} from '@/lib/storage/config';
import type { PromptPreset } from '@/types/prompt';

/**
 * GET /api/presets
 * 获取所有预设和活动预设 ID
 */
export async function GET() {
  try {
    const presets = await loadAllPresets();
    const activePresetId = await getActivePresetId();
    
    return NextResponse.json({
      presets,
      activePresetId,
    });
  } catch (error) {
    console.error('Error loading presets:', error);
    return NextResponse.json(
      { error: 'Failed to load presets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/presets
 * 保存或更新预设
 */
export async function POST(request: NextRequest) {
  try {
    const preset: PromptPreset = await request.json();
    
    // 验证必需字段
    if (!preset.id || !preset.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 禁止修改内置预设
    if (preset.isBuiltIn) {
      return NextResponse.json(
        { error: 'Cannot modify built-in preset' },
        { status: 403 }
      );
    }
    
    await savePreset(preset);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving preset:', error);
    return NextResponse.json(
      { error: 'Failed to save preset' },
      { status: 500 }
    );
  }
}