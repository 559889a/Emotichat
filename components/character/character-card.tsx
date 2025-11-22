'use client';

import { useState } from 'react';
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

interface CharacterCardProps {
  character: Character;
  onEdit: () => void;
  onDelete: () => void;
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 获取首字母（支持中英文）
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const handleCardClick = () => {
    router.push(`/chat?character=${character.id}`);
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
        className="group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer overflow-hidden"
      >
        {/* 卡片内容 */}
        <div className="p-6">
          {/* 顶部：头像和操作按钮 */}
          <div className="flex items-start justify-between mb-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {getInitials(character.name)}
              </AvatarFallback>
            </Avatar>
            
            {/* 操作按钮 - 悬停时显示 */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 角色名称 */}
          <h3 className="text-lg font-semibold mb-2 line-clamp-1">
            {character.name}
          </h3>

          {/* 角色描述 */}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
            {character.description}
          </p>

          {/* 性格标签 */}
          {character.personality && character.personality.length > 0 && (
            <div className="flex flex-wrap gap-2">
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

          {/* 底部悬停效果 - 开始对话提示 */}
          <div className="absolute inset-x-0 bottom-0 h-0 bg-primary/5 group-hover:h-12 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-sm font-medium text-primary">
              <MessageCircle className="h-4 w-4" />
              <span>开始对话</span>
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
}