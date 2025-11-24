import { NextRequest, NextResponse } from 'next/server';
import { getAllCharacters, createCharacter } from '@/lib/storage/characters';
import { CreateCharacterInput } from '@/types';

/**
 * GET /api/characters
 * 获取所有角色列表
 */
export async function GET() {
  try {
    const characters = await getAllCharacters();
    
    return NextResponse.json({
      success: true,
      data: characters,
    });
  } catch (error) {
    console.error('Failed to get characters:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取角色列表失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/characters
 * 创建新角色
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: '角色名称不能为空',
        },
        { status: 400 }
      );
    }
    
    if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: '角色描述不能为空',
        },
        { status: 400 }
      );
    }
    
    // 验证 personality 数组
    if (!Array.isArray(body.personality)) {
      return NextResponse.json(
        {
          success: false,
          error: '性格特征必须是数组',
        },
        { status: 400 }
      );
    }

    // 验证 promptConfig
    if (!body.promptConfig || typeof body.promptConfig !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: '提示词配置不能为空',
        },
        { status: 400 }
      );
    }

    // 构建创建角色的输入数据
    const characterData: CreateCharacterInput = {
      name: body.name.trim(),
      description: body.description.trim(),
      personality: body.personality,
      avatar: body.avatar,
      promptConfig: body.promptConfig,
      isUserProfile: body.isUserProfile, // 用户角色标识
    };
    
    const character = await createCharacter(characterData);
    
    return NextResponse.json(
      {
        success: true,
        data: character,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create character:', error);
    return NextResponse.json(
      {
        success: false,
        error: '创建角色失败',
      },
      { status: 500 }
    );
  }
}