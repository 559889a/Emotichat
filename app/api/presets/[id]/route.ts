import { NextRequest, NextResponse } from 'next/server';
import { deletePreset } from '@/lib/storage/config';

/**
 * DELETE /api/presets/[id]
 * 删除指定预设
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    await deletePreset(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting preset:', error);
    return NextResponse.json(
      { error: 'Failed to delete preset' },
      { status: 500 }
    );
  }
}