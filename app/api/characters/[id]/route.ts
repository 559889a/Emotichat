import { NextRequest, NextResponse } from 'next/server';
import { getCharacterById, updateCharacter, deleteCharacter } from '@/lib/storage/characters';
import { UpdateCharacterInput } from '@/types';

/**
 * GET /api/characters/[id]
 * 获取单个角色详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    return NextResponse.json({
      success: true,
      data: character,
    });
  } catch (error) {
    console.error('Failed to get character:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取角色失败',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/characters/[id]
 * 更新角色
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 验证可选字段
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      return NextResponse.json(
        {
          success: false,
          error: '角色名称不能为空',
        },
        { status: 400 }
      );
    }
    
    if (body.description !== undefined && (typeof body.description !== 'string' || body.description.trim() === '')) {
      return NextResponse.json(
        {
          success: false,
          error: '角色描述不能为空',
        },
        { status: 400 }
      );
    }

    if (body.personality !== undefined && !Array.isArray(body.personality)) {
      return NextResponse.json(
        {
          success: false,
          error: '性格特征必须是数组',
        },
        { status: 400 }
      );
    }
    
    if (body.memoryEnabled !== undefined && typeof body.memoryEnabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: '记忆功能设置必须是布尔值',
        },
        { status: 400 }
      );
    }
    
    if (body.temperature !== undefined) {
      const temp = Number(body.temperature);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        return NextResponse.json(
          {
            success: false,
            error: '温度值必须在 0-2 之间',
          },
          { status: 400 }
        );
      }
    }
    
    // 构建更新数据
    const updateData: UpdateCharacterInput = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.personality !== undefined) updateData.personality = body.personality;
    if (body.memoryEnabled !== undefined) updateData.memoryEnabled = body.memoryEnabled;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    if (body.defaultModel !== undefined) updateData.defaultModel = body.defaultModel;
    if (body.temperature !== undefined) updateData.temperature = body.temperature;
    if (body.promptConfig !== undefined) updateData.promptConfig = body.promptConfig;
    if (body.isUserProfile !== undefined) updateData.isUserProfile = body.isUserProfile; // 用户角色标识
    
    const character = await updateCharacter(id, updateData);
    
    if (!character) {
      return NextResponse.json(
        {
          success: false,
          error: '角色不存在',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: character,
    });
  } catch (error) {
    console.error('Failed to update character:', error);
    return NextResponse.json(
      {
        success: false,
        error: '更新角色失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/characters/[id]
 * 删除角色
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteCharacter(id);
    
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: '角色不存在',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Failed to delete character:', error);
    return NextResponse.json(
      {
        success: false,
        error: '删除角色失败',
      },
      { status: 500 }
    );
  }
}