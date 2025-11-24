'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Bot, Loader2, AlertCircle, User } from 'lucide-react';
import { useCharacters } from '@/hooks/useCharacters';
import type { Character } from '@/types/character';
import { CharacterCard } from '@/components/character/character-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ErrorBoundary from '@/components/layout/error-boundary';

export default function CharactersPage() {
  const router = useRouter();
  const { characters, loading, error, deleteCharacter } = useCharacters();
  const [activeTab, setActiveTab] = useState('ai-characters');

  // 分离 AI 角色和用户角色
  const aiCharacters = characters.filter((char) => !(char as any).isUserProfile);
  const userProfiles = characters.filter((char) => (char as any).isUserProfile);

  const handleCreateAICharacter = () => {
    router.push('/characters/new');
  };

  const handleCreateUserProfile = () => {
    router.push('/user-profiles/new');
  };

  const handleEditClick = (character: Character) => {
    const isUserProfile = (character as any).isUserProfile;
    if (isUserProfile) {
      router.push(`/user-profiles/${character.id}/edit`);
    } else {
      router.push(`/characters/${character.id}/edit`);
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

  // 渲染角色列表
  const renderCharacterList = (characterList: Character[], emptyMessage: string, createAction: () => void, createLabel: string) => {
    if (characterList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4">
          <div className="rounded-full bg-primary/10 p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
            <Bot className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">{emptyMessage}</h2>
          <Button onClick={createAction} size="default" className="sm:size-lg mt-4">
            <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {createLabel}
          </Button>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto space-y-3">
        {characterList.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onEdit={() => handleEditClick(character)}
            onDelete={() => handleDeleteClick(character)}
          />
        ))}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
            {/* 页面标题 */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">角色管理</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                创建和管理您的 AI 角色与用户人设
              </p>
            </div>

            {/* 标签页切换 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
                <TabsList>
                  <TabsTrigger value="ai-characters" className="gap-2">
                    <Bot className="h-4 w-4" />
                    对话角色
                  </TabsTrigger>
                  <TabsTrigger value="user-profiles" className="gap-2">
                    <User className="h-4 w-4" />
                    用户角色
                  </TabsTrigger>
                </TabsList>

                {/* 创建按钮 */}
                <Button
                  onClick={activeTab === 'ai-characters' ? handleCreateAICharacter : handleCreateUserProfile}
                  size="default"
                  className="sm:size-lg flex-shrink-0"
                >
                  <Plus className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden xs:inline">
                    {activeTab === 'ai-characters' ? '创建对话角色' : '创建用户角色'}
                  </span>
                  <span className="xs:hidden">创建</span>
                </Button>
              </div>

              {/* AI 角色标签页内容 */}
              <TabsContent value="ai-characters" className="mt-0">
                {renderCharacterList(
                  aiCharacters,
                  '还没有对话角色',
                  handleCreateAICharacter,
                  '创建第一个对话角色'
                )}
              </TabsContent>

              {/* 用户角色标签页内容 */}
              <TabsContent value="user-profiles" className="mt-0">
                {renderCharacterList(
                  userProfiles,
                  '还没有用户角色',
                  handleCreateUserProfile,
                  '创建第一个用户角色'
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}