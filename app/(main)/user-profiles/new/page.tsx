'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CharacterForm } from '@/components/character/character-form';
import type { CreateCharacterInput, UpdateCharacterInput } from '@/types/character';
import ErrorBoundary from '@/components/layout/error-boundary';

export default function NewUserProfilePage() {
  const router = useRouter();

  const handleSubmit = async (data: CreateCharacterInput | UpdateCharacterInput) => {
    try {
      // 添加标记字段，表明这是用户角色
      const profileData = {
        ...data,
        isUserProfile: true,
      };

      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建失败');
      }

      router.push('/characters');
    } catch (error) {
      console.error('Failed to create user profile:', error);
      alert(error instanceof Error ? error.message : '创建用户角色失败');
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/characters');
  };

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-4xl">
            {/* 页面标题 */}
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回角色管理
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold">创建用户角色</h1>
              <p className="text-sm text-muted-foreground mt-2">
                定义您在对话中的人设，让 AI 更了解您
              </p>
            </div>

            {/* 角色表单 - 非弹窗模式 */}
            <Card className="p-6">
              <CharacterForm
                open={true}
                onOpenChange={handleCancel}
                onSubmit={handleSubmit}
                isUserProfile={true}
                asDialog={false}
              />
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
