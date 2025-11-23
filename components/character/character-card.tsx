'use client';

import { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, MessageCircle } from 'lucide-react';
import type { Character } from '@/types/character';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
}

export const CharacterCard = memo(function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  
  const { createConversation } = useConversations();
  const { setCurrentConversation } = useConversationStore();

  // 获取首字母（支持中英文）
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    // 如果点击的是操作按钮，不触发卡片点击
    if ((e.target as HTMLElement).closest('button')) {
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
        className="group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer overflow-hidden active:scale-[0.98]"
      >
        {/* 卡片内容 */}
        <div className="p-4 pb-14 sm:p-5 sm:pb-15 md:p-6 md:pb-6">
          {/* 顶部：头像和操作按钮 */}
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <Avatar className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12">
              <AvatarFallback className="text-base sm:text-lg font-semibold bg-primary/10 text-primary">
                {getInitials(character.name)}
              </AvatarFallback>
            </Avatar>
            
            {/* 操作按钮 - 悬停时显示 */}
            <div className="flex gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={handleEdit}
              >
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* 角色名称 */}
          <h3 className="text-base sm:text-lg font-semibold mb-2 line-clamp-1">
            {character.name}
          </h3>

          {/* 角色描述 */}
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2 min-h-[2.5rem]">
            {character.description}
          </p>

          {/* 性格标签 - 桌面端悬停时上移 */}
          {character.personality && character.personality.length > 0 && (
            <div className="flex flex-wrap gap-2 transition-transform duration-200 md:group-hover:-translate-y-14">
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

        {/* 底部"开始对话"按钮区域 */}
        {/* 移动端：固定显示在底部 */}
        {/* 桌面端：悬停时显示 */}
        <div className="absolute inset-x-0 bottom-0 h-11 sm:h-12 bg-primary/5 flex items-center justify-center md:h-0 md:bg-transparent md:group-hover:h-12 md:group-hover:bg-primary/5 transition-all duration-200">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-primary md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{isCreatingConversation ? '创建中...' : '开始对话'}</span>
          </div>
        </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除角色 "{character.name}" 吗？此操作无法撤销。
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