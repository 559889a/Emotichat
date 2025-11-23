'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { MessageVersion } from '@/types';
import { cn } from '@/lib/utils';

interface VersionSelectorProps {
  versions: MessageVersion[];
  currentVersionId: string;
  onVersionChange: (versionId: string) => void;
  className?: string;
}

export function VersionSelector({
  versions,
  currentVersionId,
  onVersionChange,
  className,
}: VersionSelectorProps) {
  if (!versions || versions.length <= 1) {
    return null; // 只有一个版本时不显示选择器
  }

  const currentIndex = versions.findIndex(v => v.id === currentVersionId);
  const currentVersion = versions[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < versions.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onVersionChange(versions[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onVersionChange(versions[currentIndex + 1].id);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <History className="h-3.5 w-3.5" />
      
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        title="上一个版本"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      <span className="min-w-[120px] text-center">
        版本 {currentIndex + 1} / {versions.length}
        {currentVersion && (
          <span className="block text-[10px] text-muted-foreground/60">
            {formatTimestamp(currentVersion.timestamp)}
          </span>
        )}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleNext}
        disabled={!canGoNext}
        title="下一个版本"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>

      {currentVersion?.model && (
        <span className="text-[10px] text-muted-foreground/60 ml-2">
          {currentVersion.model}
        </span>
      )}
    </div>
  );
}