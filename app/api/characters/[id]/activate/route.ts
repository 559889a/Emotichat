import { NextRequest, NextResponse } from 'next/server';
import { setActiveUserProfile, deactivateUserProfile, getCharacterById } from '@/lib/storage/characters';

/**
 * POST /api/characters/[id]/activate
 * 激活用户角色（全局最多只能激活一个用户角色）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证角色是否存在且是用户角色
    const character = await getCharacterById(id);
    if (!character) {
      return NextResponse.json(
        {
          success: false,
          error: '角色不存在',
        },
        { status: 404 }
      );
    }

    if (!character.isUserProfile) {
      return NextResponse.json(
        {
          success: false,
          error: '只有用户角色可以被激活',
        },
        { status: 400 }
      );
    }

    // 激活用户角色（会自动取消其他用户角色的激活状态）
    const updatedCharacter = await setActiveUserProfile(id);

    return NextResponse.json({
      success: true,
      data: updatedCharacter,
    });
  } catch (error) {
    console.error('Failed to activate user profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: '激活用户角色失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/characters/[id]/activate
 * 取消激活用户角色
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证角色是否存在且是用户角色
    const character = await getCharacterById(id);
    if (!character) {
      return NextResponse.json(
        {
          success: false,
          error: '角色不存在',
        },
        { status: 404 }
      );
    }

    if (!character.isUserProfile) {
      return NextResponse.json(
        {
          success: false,
          error: '只有用户角色可以被取消激活',
        },
        { status: 400 }
      );
    }

    // 取消激活
    const updatedCharacter = await deactivateUserProfile(id);

    return NextResponse.json({
      success: true,
      data: updatedCharacter,
    });
  } catch (error) {
    console.error('Failed to deactivate user profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: '取消激活用户角色失败',
      },
      { status: 500 }
    );
  }
}
