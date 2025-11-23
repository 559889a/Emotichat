import { NextRequest, NextResponse } from 'next/server';
import {
  getConversationById,
  updateConversation,
  deleteConversation,
  getMessages,
} from '@/lib/storage/conversations';
import type { UpdateConversationInput } from '@/types';

/**
 * GET /api/conversations/[id]
 * 获取单个对话详情（包含消息）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    // 获取对话的所有消息
    const messages = await getMessages(id);
    
    return NextResponse.json({
      success: true,
      data: {
        ...conversation,
        messages,
      },
    });
  } catch (error) {
    console.error('Failed to get conversation:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取对话失败',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/conversations/[id]
 * 更新对话信息（标题、提示词配置等）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // 构建更新对象
    const updates: UpdateConversationInput = {};
    
    // 验证并添加 title
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: '对话标题不能为空',
          },
          { status: 400 }
        );
      }
      updates.title = body.title.trim();
    }
    
    // 验证并添加 promptConfig
    if (body.promptConfig !== undefined) {
      // 基本验证：确保 promptConfig 是对象且有 prompts 数组
      if (typeof body.promptConfig !== 'object' || !Array.isArray(body.promptConfig.prompts)) {
        return NextResponse.json(
          {
            success: false,
            error: '提示词配置格式无效',
          },
          { status: 400 }
        );
      }
      updates.promptConfig = body.promptConfig;
    }
    
    // 验证并添加 modelConfig
    if (body.modelConfig !== undefined) {
      // modelConfig 可以是 null/undefined (表示使用默认) 或对象
      if (body.modelConfig === null) {
        updates.modelConfig = undefined;
      } else if (typeof body.modelConfig === 'object') {
        // 基本验证：确保有必要的字段
        if (!body.modelConfig.providerId || !body.modelConfig.modelId) {
          return NextResponse.json(
            {
              success: false,
              error: '模型配置格式无效：缺少 providerId 或 modelId',
            },
            { status: 400 }
          );
        }
        updates.modelConfig = body.modelConfig;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: '模型配置格式无效',
          },
          { status: 400 }
        );
      }
    }
    
    // 确保至少有一个字段要更新
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '请提供要更新的字段',
        },
        { status: 400 }
      );
    }
    
    const conversation = await updateConversation(id, updates);
    
    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: '对话不存在',
        },
        { status: 404 }
      );
    }
    
    console.error('Failed to update conversation:', error);
    return NextResponse.json(
      {
        success: false,
        error: '更新对话失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]
 * 删除对话
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteConversation(id);
    
    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return NextResponse.json(
      {
        success: false,
        error: '删除对话失败',
      },
      { status: 500 }
    );
  }
}