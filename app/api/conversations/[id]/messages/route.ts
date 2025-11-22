import { NextRequest, NextResponse } from 'next/server';
import { getMessages, addMessage, getConversationById } from '@/lib/storage/conversations';
import { MessageRole } from '@/types';

/**
 * GET /api/conversations/[id]/messages
 * 获取对话的所有消息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 先检查对话是否存在
    const conversation = await getConversationById(id);
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: '对话不存在',
        },
        { status: 404 }
      );
    }
    
    const messages = await getMessages(id);
    
    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Failed to get messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取消息失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[id]/messages
 * 添加新消息到对话
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 验证必填字段
    if (!body.role || typeof body.role !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: '消息角色不能为空',
        },
        { status: 400 }
      );
    }
    
    // 验证角色是否有效
    const validRoles: MessageRole[] = ['user', 'assistant', 'system'];
    if (!validRoles.includes(body.role as MessageRole)) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的消息角色，必须是 user、assistant 或 system',
        },
        { status: 400 }
      );
    }
    
    if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: '消息内容不能为空',
        },
        { status: 400 }
      );
    }
    
    // 验证可选字段
    if (body.model !== undefined && typeof body.model !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: '模型名称必须是字符串',
        },
        { status: 400 }
      );
    }
    
    if (body.tokenCount !== undefined) {
      const count = Number(body.tokenCount);
      if (isNaN(count) || count < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'token 数量必须是非负数',
          },
          { status: 400 }
        );
      }
    }
    
    // 先检查对话是否存在
    const conversation = await getConversationById(id);
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: '对话不存在',
        },
        { status: 404 }
      );
    }
    
    // 构建消息数据
    const messageData = {
      role: body.role as MessageRole,
      content: body.content.trim(),
      model: body.model,
      tokenCount: body.tokenCount ? Number(body.tokenCount) : undefined,
    };
    
    const message = await addMessage(id, messageData);
    
    return NextResponse.json(
      {
        success: true,
        data: message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to add message:', error);
    return NextResponse.json(
      {
        success: false,
        error: '添加消息失败',
      },
      { status: 500 }
    );
  }
}