import { MessageSquare, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ChatPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        {/* 图标 */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-2xl opacity-20"></div>
          <div className="relative bg-gradient-to-br from-pink-500 to-purple-500 p-6 rounded-full">
            <MessageSquare className="h-16 w-16 text-white" />
          </div>
        </div>

        {/* 标题 */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            欢迎来到 EmotiChat
          </h1>
          <p className="text-xl text-muted-foreground">
            您的情感陪护AI伴侣，随时倾听、理解和支持您
          </p>
        </div>

        {/* 功能特点 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
          <div className="p-4 rounded-lg border bg-card">
            <Sparkles className="h-6 w-6 mb-2 text-pink-500" />
            <h3 className="font-semibold mb-1">智能对话</h3>
            <p className="text-sm text-muted-foreground">
              基于先进AI技术的自然对话体验
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <MessageSquare className="h-6 w-6 mb-2 text-purple-500" />
            <h3 className="font-semibold mb-1">情感支持</h3>
            <p className="text-sm text-muted-foreground">
              理解您的情绪，提供温暖的陪伴
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <Sparkles className="h-6 w-6 mb-2 text-pink-500" />
            <h3 className="font-semibold mb-1">个性化体验</h3>
            <p className="text-sm text-muted-foreground">
              根据您的喜好定制对话风格
            </p>
          </div>
        </div>

        {/* 开始按钮 */}
        <Button 
          size="lg" 
          className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
        >
          <MessageSquare className="mr-2 h-5 w-5" />
          开始聊天
        </Button>

        <p className="text-sm text-muted-foreground mt-4">
          聊天功能正在开发中，敬请期待...
        </p>
      </div>
    </div>
  )
}