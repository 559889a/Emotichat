import { Users, Sparkles, Heart, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CharactersPage() {
  return (
    <div className="flex h-full items-center justify-center p-4 md:p-8">
      <div className="flex flex-col items-center gap-6 md:gap-8 text-center max-w-3xl w-full px-4">
        {/* 图标 */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-2xl opacity-20"></div>
          <div className="relative bg-gradient-to-br from-pink-500 to-purple-500 p-6 rounded-full">
            <Users className="h-16 w-16 text-white" />
          </div>
        </div>

        {/* 标题 */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            AI 角色管理
          </h1>
          <p className="text-xl text-muted-foreground">
            创建和管理您的AI伴侣，定制独特的性格和对话风格
          </p>
        </div>

        {/* 功能预览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
          <div className="p-6 rounded-lg border bg-card text-left">
            <Heart className="h-8 w-8 mb-3 text-pink-500" />
            <h3 className="font-semibold text-lg mb-2">自定义性格</h3>
            <p className="text-sm text-muted-foreground">
              设定AI的性格特征、说话方式和情感表达风格，创造独一无二的陪伴体验
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-left">
            <Brain className="h-8 w-8 mb-3 text-purple-500" />
            <h3 className="font-semibold text-lg mb-2">知识定制</h3>
            <p className="text-sm text-muted-foreground">
              为每个角色配置专属的知识库和记忆系统，让对话更加个性化和智能
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-left">
            <Sparkles className="h-8 w-8 mb-3 text-pink-500" />
            <h3 className="font-semibold text-lg mb-2">预设模板</h3>
            <p className="text-sm text-muted-foreground">
              选择预设的角色模板快速开始，或从头创建完全定制的AI伴侣
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-left">
            <Users className="h-8 w-8 mb-3 text-purple-500" />
            <h3 className="font-semibold text-lg mb-2">多角色切换</h3>
            <p className="text-sm text-muted-foreground">
              轻松管理多个AI角色，根据不同场景和需求自由切换对话伴侣
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 mt-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            创建角色
          </Button>
          <Button size="lg" variant="outline">
            <Users className="mr-2 h-5 w-5" />
            浏览模板
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          角色管理功能正在开发中，敬请期待...
        </p>
      </div>
    </div>
  )
}