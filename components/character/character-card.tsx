'use client';

import { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, MessageCircle, Check } from 'lucide-react';
import type { Character } from '@/types/character';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConversations } from '@/hooks/useConversations';
import { useConversationStore } from '@/stores/conversation';

interface CharacterCardProps {
  character: Character;
  onEdit: () => void;
  onDelete: () => void;
  onActivationChange?: (isActive: boolean) => Promise<void>;
}

export const CharacterCard = memo(function CharacterCard({ character, onEdit, onDelete, onActivationChange }: CharacterCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isTogglingActivation, setIsTogglingActivation] = useState(false);

  const { createConversation } = useConversations();
  const { setCurrentConversation } = useConversationStore();

  // 判断是否为用户角色
  const isUserProfile = (character as any).isUserProfile === true;
  const isActive = (character as any).isActive === true;

  // 获取首字母（支持中英文）
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  // 处理激活状态切换
  const handleActivationToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onActivationChange || isTogglingActivation) return;

    setIsTogglingActivation(true);
    try {
      await onActivationChange(!isActive);
    } catch (error) {
      console.error('Failed to toggle activation:', error);
    } finally {
      setIsTogglingActivation(false);
    }
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    // 如果点击的是操作按钮或开关，不触发卡片点击
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="switch"]')) {
      return;
    }

    // 用户角色不能开始对话
    if (isUserProfile) {
      return;
    }

    // 防止重复点击
    if (isCreatingConversation) {
      return;
    }

    // 创建新对话
    setIsCreatingConversation(true);
    try {
      const conversation = await createConversation({
        characterId: character.id,
        title: `与${character.name}的对话`,
      });

      if (conversation) {
        // 设置为当前对话
        setCurrentConversation(conversation.id);
        // 跳转到新对话页面
        router.push(`/chat?id=${conversation.id}`);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer overflow-hidden active:scale-[0.99]"
      >
        {/* 卡片内容 - 横向布局 */}
        <div className="flex items-center gap-4 p-4">
          {/* 左侧：头像 */}
          <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
            <AvatarFallback className="text-lg sm:text-xl font-semibold bg-primary/10 text-primary">
              {getInitials(character.name)}
            </AvatarFallback>
          </Avatar>

          {/* 中间：信息区域 */}
          <div className="flex-1 min-w-0">
            {/* 角色名称和激活状态 */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-semibold line-clamp-1">
                {character.name}
              </h3>
              {/* 用户角色激活状态标识 */}
              {isUserProfile && isActive && (
                <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  激活中
                </Badge>
              )}
            </div>

            {/* 角色描述 */}
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mb-2">
              {character.description}
            </p>

            {/* 性格标签 */}
            {character.personality && character.personality.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {character.personality.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {character.personality.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{character.personality.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 用户角色激活开关 */}
            {isUserProfile && onActivationChange && (
              <div
                className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-muted-foreground">
                  {isTogglingActivation ? '切换中...' : (isActive ? '已激活' : '未激活')}
                </span>
                <Switch
                  checked={isActive}
                  onCheckedChange={() => handleActivationToggle({ stopPropagation: () => {} } as React.MouseEvent)}
                  disabled={isTogglingActivation}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
              title="编辑"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDeleteClick}
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 悬停时显示"开始对话"提示（仅对话角色） */}
        {!isUserProfile && (
          <div className="absolute inset-x-0 bottom-0 h-0 bg-primary/5 flex items-center justify-center group-hover:h-10 transition-all duration-200">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{isCreatingConversation ? '创建中...' : '开始对话'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除角色 &quot;{character.name}&quot; 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});