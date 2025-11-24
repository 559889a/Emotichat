'use client';

import { useRouter } from 'next/navigation';
import { Plus, Bot, Loader2, AlertCircle } from 'lucide-react';
import { useCharacters } from '@/hooks/useCharacters';
import type { Character } from '@/types/character';
import { CharacterCard } from '@/components/character/character-card';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/layout/error-boundary';

export default function CharactersPage() {
  const router = useRouter();
  const { characters, loading, error, deleteCharacter } = useCharacters();

  const handleCreateClick = () => {
    router.push('/characters/new');
  };

  const handleEditClick = (character: Character) => {
    router.push(`/characters/${character.id}/edit`);
  };

  const handleDeleteClick = async (character: Character) => {
    await deleteCharacter(character.id);
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>加载角色列表中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4 text-destructive max-w-md text-center">
          <AlertCircle className="h-12 w-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">加载失败</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">角色管理</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
            创建和管理您的 AI 角色
          </p>
        </div>
        <Button onClick={handleCreateClick} size="default" className="sm:size-lg flex-shrink-0">
          <Plus className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden xs:inline">创建角色</span>
          <span className="xs:hidden">创建</span>
        </Button>
      </div>

      {/* 角色列表 */}
      {characters.length === 0 ? (
        // 空状态
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4">
          <div className="rounded-full bg-primary/10 p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
            <Bot className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">还没有角色</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md mb-4 sm:mb-5 md:mb-6">
            创建您的第一个 AI 角色，开始个性化的对话体验
          </p>
          <Button onClick={handleCreateClick} size="default" className="sm:size-lg">
            <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            创建第一个角色
          </Button>
        </div>
      ) : (
        // 角色卡片网格
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={() => handleEditClick(character)}
              onDelete={() => handleDeleteClick(character)}
            />
          ))}
        </div>
      )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}