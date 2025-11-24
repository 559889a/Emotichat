'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CharacterForm } from '@/components/character/character-form';
import type { Character, UpdateCharacterInput } from '@/types/character';
import ErrorBoundary from '@/components/layout/error-boundary';

export default function EditUserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载用户角色
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`/api/characters/${profileId}`);
        if (!response.ok) throw new Error('加载失败');

        const data = await response.json();
        setProfile(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载用户角色失败');
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      loadProfile();
    }
  }, [profileId]);

  const handleSubmit = async (data: UpdateCharacterInput) => {
    try {
      // 保持 isUserProfile 标记
      const profileData = {
        ...data,
        isUserProfile: true,
      };

      const response = await fetch(`/api/characters/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '保存失败');
      }

      router.push('/characters');
    } catch (error) {
      console.error('Failed to update user profile:', error);
      alert(error instanceof Error ? error.message : '保存用户角色失败');
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/characters');
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>加载用户角色中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4 text-destructive max-w-md text-center">
          <p className="text-lg font-semibold">加载失败</p>
          <p className="text-sm text-muted-foreground">{error || '找不到该用户角色'}</p>
          <Button onClick={() => router.push('/characters')} variant="outline">
            返回角色管理
          </Button>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl sm:text-3xl font-bold">编辑用户角色</h1>
              <p className="text-sm text-muted-foreground mt-2">
                修改您的人设和角色特征
              </p>
            </div>

            {/* 角色表单 - 非弹窗模式 */}
            <Card className="p-6">
              <CharacterForm
                open={true}
                onOpenChange={handleCancel}
                character={profile}
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
