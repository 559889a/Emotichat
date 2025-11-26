'use client';

import { useCallback, useState } from 'react';

interface MessageEditingHandlers {
  isEditing: boolean;
  beginEdit: () => void;
  saveEdit: (content: string) => void;
  cancelEdit: () => void;
}

interface MessageEditingOptions {
  isUser: boolean;
  onEdit?: (content: string) => void;
  onEditAssistant?: (content: string) => void;
}

export function useMessageEditing({
  isUser,
  onEdit,
  onEditAssistant,
}: MessageEditingOptions): MessageEditingHandlers {
  const [isEditing, setIsEditing] = useState(false);

  const beginEdit = useCallback(() => setIsEditing(true), []);

  const saveEdit = useCallback(
    (content: string) => {
      if (isUser) {
        onEdit?.(content);
      } else {
        onEditAssistant?.(content);
      }
      setIsEditing(false);
    },
    [isUser, onEdit, onEditAssistant]
  );

  const cancelEdit = useCallback(() => setIsEditing(false), []);

  return {
    isEditing,
    beginEdit,
    saveEdit,
    cancelEdit,
  };
}
