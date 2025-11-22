import { NextRequest, NextResponse } from 'next/server';
import { getConversationSummaries, createConversation } from '@/lib/storage/conversations';
import { CreateConversationInput } from '@/types';

/**
 * GET /api/conversations
 * 获取所有对话概要列表
 */
export async function GET() {
  try {
    const summaries = await getConversationSummaries();
    
    return NextResponse.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error('Failed to get conversation summaries:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取对话列表失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * 创建新对话
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.characterId || typeof body.characterId !== 'string' || body.characterId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: '角色 ID 不能为空',
        },
        { status: 400 }
      );
    }
    
    // 验证可选的 title 字段
    if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
      return NextResponse.json(
        {
          success: false,
          error: '对话标题不能为空字符串',
        },
        { status: 400 }
      );
    }
    
    // 构建创建对话的输入数据
    const conversationData: CreateConversationInput = {
      characterId: body.characterId.trim(),
      title: body.title?.trim(),
    };
    
    const conversation = await createConversation(conversationData);
    
    return NextResponse.json(
      {
        success: true,
        data: conversation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json(
      {
        success: false,
        error: '创建对话失败',
      },
      { status: 500 }
    );
  }
}