import { NextRequest, NextResponse } from 'next/server';
import {
  updateMessage,
  deleteMessage,
  addMessageVersion,
  switchMessageVersion,
  getConversationById,
} from '@/lib/storage/conversations';

/**
 * PATCH /api/conversations/[id]/messages/[messageId]
 * 更新消息（编辑消息内容）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;
    const body = await request.json();

    // 验证对话是否存在
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

    // 验证请求类型
    const action = body.action;
    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少操作类型（action）',
        },
        { status: 400 }
      );
    }

    // 处理编辑消息
    if (action === 'edit') {
      if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: '消息内容不能为空',
          },
          { status: 400 }
        );
      }

      const updatedMessage = await updateMessage(id, messageId, body.content.trim());

      return NextResponse.json({
        success: true,
        data: updatedMessage,
      });
    }

    // 处理添加版本（重新生成）
    if (action === 'add_version') {
      if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: '版本内容不能为空',
          },
          { status: 400 }
        );
      }

      const updatedMessage = await addMessageVersion(
        id,
        messageId,
        body.content.trim(),
        body.model
      );

      return NextResponse.json({
        success: true,
        data: updatedMessage,
      });
    }

    // 处理切换版本
    if (action === 'switch_version') {
      if (!body.versionId || typeof body.versionId !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: '版本ID不能为空',
          },
          { status: 400 }
        );
      }

      const updatedMessage = await switchMessageVersion(id, messageId, body.versionId);

      return NextResponse.json({
        success: true,
        data: updatedMessage,
      });
    }

    // 处理设置思维链标签（LLM 辅助识别结果）
    if (action === 'set_thinking_tag') {
      const { thinkingTagPrepend, thinkingTagAppend, thinkingTagProcessed } = body;

      const updatedMessage = await updateMessage(id, messageId, undefined, {
        thinkingTagPrepend,
        thinkingTagAppend,
        thinkingTagProcessed,
      });

      return NextResponse.json({
        success: true,
        data: updatedMessage,
      });
    }

    // 处理 AI 消息编辑（不触发重新生成）
    if (action === 'edit_assistant') {
      if (!body.content || typeof body.content !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: '消息内容不能为空',
          },
          { status: 400 }
        );
      }

      // 直接更新消息内容，并重置思维链处理状态
      const updatedMessage = await updateMessage(id, messageId, body.content.trim(), {
        thinkingTagProcessed: false, // 重置处理状态，允许重新检测
        thinkingTagPrepend: undefined,
        thinkingTagAppend: undefined,
      });

      return NextResponse.json({
        success: true,
        data: updatedMessage,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `不支持的操作类型: ${action}`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新消息失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]/messages/[messageId]
 * 删除消息
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;
    const { searchParams } = new URL(request.url);
    const deleteFollowing = searchParams.get('deleteFollowing') === 'true';

    // 验证对话是否存在
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

    await deleteMessage(id, messageId, deleteFollowing);

    return NextResponse.json({
      success: true,
      message: deleteFollowing ? '已删除消息及其之后的所有消息' : '已删除消息',
    });
  } catch (error) {
    console.error('Failed to delete message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除消息失败',
      },
      { status: 500 }
    );
  }
}