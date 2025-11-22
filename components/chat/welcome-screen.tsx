'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  characterName: string;
  characterAvatar: string;
  characterDescription?: string;
}

export function WelcomeScreen({
  characterName,
  characterAvatar,
  characterDescription,
}: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* 角色头像 */}
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
              <AvatarFallback className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white text-3xl font-semibold">
                {characterAvatar}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center border-2 border-background">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>

        {/* 欢迎文本 */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            与 {characterName} 开始对话
          </h1>
          
          {characterDescription && (
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
              {characterDescription}
            </p>
          )}
        </div>

        {/* 建议的开场白 */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-medium">
            您可以这样开始：
          </p>
          <div className="grid gap-2 max-w-md mx-auto">
            <div className="group px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-default">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                你好，很高兴认识你！
              </p>
            </div>
            <div className="group px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-default">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                今天过得怎么样？
              </p>
            </div>
            <div className="group px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-default">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                能和我聊聊吗？
              </p>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="pt-6">
          <p className="text-xs text-muted-foreground/60">
            在下方输入框输入消息，按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}