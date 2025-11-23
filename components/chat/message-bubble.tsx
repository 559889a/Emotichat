'use client';

import { Message } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';
import { MessageActions } from './message-actions';
import { MessageEditor } from './message-editor';
import { VersionSelector } from './version-selector';

interface MessageBubbleProps {
  message: Message;
  characterName?: string;
  characterAvatar?: string;
  onEdit?: (content: string) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onDeleteFollowing?: () => void;
  onCopy?: () => void;
  onVersionChange?: (versionId: string) => void;
  onCreateBranch?: () => void;
}

export function MessageBubble({
  message,
  characterName,
  characterAvatar,
  onEdit,
  onRegenerate,
  onDelete,
  onDeleteFollowing,
  onCopy,
  onVersionChange,
  onCreateBranch,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (content: string) => {
    if (onEdit) {
      onEdit(content);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleVersionChange = (versionId: string) => {
    if (onVersionChange) {
      onVersionChange(versionId);
    }
  };

  const currentVersionId = message.versions?.find(v => v.isActive)?.id ||
                          (message.versions && message.versions.length > 0 ? message.versions[message.versions.length - 1].id : '');

  // 用户消息
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4 group">
        <div className="max-w-[80%] space-y-2">
          {isEditing ? (
            <MessageEditor
              initialContent={message.content}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              className="bg-primary/10 px-4 py-2.5 rounded-2xl"
            />
          ) : (
            <>
              <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl break-words">
                <MarkdownRenderer content={message.content} className="text-primary-foreground" />
                {message.isEdited && (
                  <div className="text-xs opacity-70 mt-1">
                    已编辑
                  </div>
                )}
              </div>

              {/* 版本选择器 */}
              {message.versions && message.versions.length > 1 && (
                <VersionSelector
                  versions={message.versions}
                  currentVersionId={currentVersionId}
                  onVersionChange={handleVersionChange}
                  className="justify-end"
                />
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <MessageActions
                  message={message}
                  onEdit={onEdit ? handleEdit : undefined}
                  onDelete={onDelete}
                  onDeleteFollowing={onDeleteFollowing}
                  onCopy={onCopy}
                  onCreateBranch={onCreateBranch}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // AI 消息
  return (
    <div className="flex gap-3 group mb-4">
      <Avatar className="h-8 w-8 shrink-0 mt-1">
        <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium">
          {characterAvatar || 'AI'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1 min-w-0">
        {characterName && (
          <span className="text-xs text-muted-foreground font-medium">
            {characterName}
          </span>
        )}
        
        <MarkdownRenderer content={message.content} />

        {/* 版本选择器 */}
        {message.versions && message.versions.length > 1 && (
          <VersionSelector
            versions={message.versions}
            currentVersionId={currentVersionId}
            onVersionChange={handleVersionChange}
          />
        )}

        {/* 操作按钮 */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageActions
            message={message}
            onRegenerate={onRegenerate}
            onDelete={onDelete}
            onDeleteFollowing={onDeleteFollowing}
            onCopy={onCopy}
            onCreateBranch={onCreateBranch}
          />
        </div>

        {/* 模型信息和重新生成次数 */}
        {(message.model || message.regenerationCount) && (
          <div className="text-xs text-muted-foreground/60 pt-1 flex gap-2">
            {message.model && <span>{message.model}</span>}
            {message.regenerationCount && message.regenerationCount > 0 && (
              <span>• 已重新生成 {message.regenerationCount} 次</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}