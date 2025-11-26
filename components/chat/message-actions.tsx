'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Copy, 
  RotateCcw, 
  Edit2, 
  Trash2, 
  MoreVertical,
  GitBranch,
  Check 
} from 'lucide-react';
import { useState } from 'react';
import { Message, MessageRole } from '@/types';

interface MessageActionsProps {
  message: Message;
  onEdit?: () => void;           // 用户消息编辑（会触发重新生成）
  onEditAssistant?: () => void;  // AI 消息编辑（不触发重新生成）
  onRegenerate?: () => void;
  onDelete?: () => void;
  onDeleteFollowing?: () => void;
  onCopy?: () => void;
  onCreateBranch?: () => void;
  className?: string;
}

export function MessageActions({
  message,
  onEdit,
  onEditAssistant,
  onRegenerate,
  onDelete,
  onDeleteFollowing,
  onCopy,
  onCreateBranch,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteFollowing, setDeleteFollowing] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else {
      await navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
    setDeleteFollowing(false);
  };

  const handleDeleteFollowing = () => {
    setShowDeleteDialog(true);
    setDeleteFollowing(true);
  };

  const confirmDelete = () => {
    if (deleteFollowing && onDeleteFollowing) {
      onDeleteFollowing();
    } else if (onDelete) {
      onDelete();
    }
    setShowDeleteDialog(false);
  };

  const isUserMessage = message.role === 'user';

  return (
    <>
      <div className={className}>
        {/* 快捷操作按钮 */}
        <div className="flex gap-1">
          {/* 复制按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-accent"
            onClick={handleCopy}
            title={copied ? '已复制' : '复制消息'}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* 用户消息：编辑按钮（会触发重新生成） */}
          {isUserMessage && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-accent"
              onClick={onEdit}
              title="编辑消息"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* AI 消息：编辑按钮（不触发重新生成） */}
          {!isUserMessage && onEditAssistant && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-accent"
              onClick={onEditAssistant}
              title="编辑回复"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* 重试/重新生成按钮 */}
          {onRegenerate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-accent"
              onClick={onRegenerate}
              title={isUserMessage ? "重试" : "重新生成"}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* 更多选项 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-accent"
                title="更多选项"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isUserMessage && onEdit && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    编辑消息
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {!isUserMessage && onEditAssistant && (
                <>
                  <DropdownMenuItem onClick={onEditAssistant}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    编辑回复
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {onRegenerate && (
                <>
                  <DropdownMenuItem onClick={onRegenerate}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {isUserMessage ? '重试' : '重新生成'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {onCreateBranch && (
                <>
                  <DropdownMenuItem onClick={onCreateBranch}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    创建分支
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? '已复制' : '复制消息'}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {onDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除消息
                </DropdownMenuItem>
              )}

              {onDeleteFollowing && (
                <DropdownMenuItem
                  onClick={handleDeleteFollowing}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除此消息及之后
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteFollowing
                ? '确定要删除此消息及其之后的所有消息吗？此操作无法撤销。'
                : '确定要删除此消息吗？此操作无法撤销。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}