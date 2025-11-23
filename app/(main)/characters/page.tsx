'use client';

import { useState } from 'react';
import { Plus, Bot, Loader2, AlertCircle } from 'lucide-react';
import { useCharacters } from '@/hooks/useCharacters';
import type { Character, CreateCharacterInput, UpdateCharacterInput } from '@/types/character';
import { CharacterCard } from '@/components/character/character-card';
import { CharacterForm } from '@/components/character/character-form';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/layout/error-boundary';

export default function CharactersPage() {
  const { characters, loading, error, createCharacter, updateCharacter, deleteCharacter } = useCharacters();
  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | undefined>(undefined);

  const handleCreateClick = () => {
    setEditingCharacter(undefined);
    setShowForm(true);
  };

  const handleEditClick = (character: Character) => {
    setEditingCharacter(character);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: CreateCharacterInput | UpdateCharacterInput) => {
    if (editingCharacter) {
      // 编辑模式
      await updateCharacter(editingCharacter.id, data as UpdateCharacterInput);
    } else {
      // 创建模式
      await createCharacter(data as CreateCharacterInput);
    }
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
      <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">角色管理</h1>
          <p className="text-muted-foreground mt-2">
            创建和管理您的 AI 角色
          </p>
        </div>
        <Button onClick={handleCreateClick} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          创建角色
        </Button>
      </div>

      {/* 角色列表 */}
      {characters.length === 0 ? (
        // 空状态
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <Bot className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">还没有角色</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            创建您的第一个 AI 角色，开始个性化的对话体验
          </p>
          <Button onClick={handleCreateClick} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            创建第一个角色
          </Button>
        </div>
      ) : (
        // 角色卡片网格
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* 创建/编辑表单对话框 */}
      <CharacterForm
        open={showForm}
        onOpenChange={setShowForm}
        character={editingCharacter}
        onSubmit={handleFormSubmit}
      />
      </div>
    </ErrorBoundary>
  );
}