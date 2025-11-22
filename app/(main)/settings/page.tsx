import { Settings, Palette, Bell, Shield, Globe, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center p-4 md:p-8">
      <div className="flex flex-col items-center gap-6 md:gap-8 text-center max-w-3xl w-full px-4">
        {/* 图标 */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-2xl opacity-20"></div>
          <div className="relative bg-gradient-to-br from-pink-500 to-purple-500 p-6 rounded-full">
            <Settings className="h-16 w-16 text-white" />
          </div>
        </div>

        {/* 标题 */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            应用设置
          </h1>
          <p className="text-xl text-muted-foreground">
            个性化您的 EmotiChat 体验，打造专属的AI陪伴环境
          </p>
        </div>

        {/* 设置类别 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
          <div className="p-6 rounded-lg border bg-card text-left hover:border-pink-500/50 transition-colors cursor-pointer">
            <Palette className="h-8 w-8 mb-3 text-pink-500" />
            <h3 className="font-semibold text-lg mb-2">外观设置</h3>
            <p className="text-sm text-muted-foreground">
              自定义主题颜色、字体大小、界面布局等视觉元素
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-left hover:border-purple-500/50 transition-colors cursor-pointer">
            <Bell className="h-8 w-8 mb-3 text-purple-500" />
            <h3 className="font-semibold text-lg mb-2">通知设置</h3>
            <p className="text-sm text-muted-foreground">
              管理消息通知、提醒方式和通知时段偏好设置
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-left hover:border-pink-500/50 transition-colors cursor-pointer">
            <Shield className="h-8 w-8 mb-3 text-pink-500" />
            <h3 className="font-semibold text-lg mb-2">隐私安全</h3>
            <p className="text-sm text-muted-foreground">
              控制数据隐私、聊天记录保存和账户安全选项
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-left hover:border-purple-500/50 transition-colors cursor-pointer">
            <Globe className="h-8 w-8 mb-3 text-purple-500" />
            <h3 className="font-semibold text-lg mb-2">语言区域</h3>
            <p className="text-sm text-muted-foreground">
              设置界面语言、时区和地区偏好设置
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-left hover:border-pink-500/50 transition-colors cursor-pointer">
            <Zap className="h-8 w-8 mb-3 text-pink-500" />
            <h3 className="font-semibold text-lg mb-2">AI 模型配置</h3>
            <p className="text-sm text-muted-foreground">
              选择和配置AI模型、API密钥和高级参数设置
            </p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card text-left hover:border-purple-500/50 transition-colors cursor-pointer">
            <Settings className="h-8 w-8 mb-3 text-purple-500" />
            <h3 className="font-semibold text-lg mb-2">高级设置</h3>
            <p className="text-sm text-muted-foreground">
              访问实验性功能、开发者选项和系统诊断工具
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 mt-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            <Settings className="mr-2 h-5 w-5" />
            打开设置
          </Button>
          <Button size="lg" variant="outline">
            恢复默认
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          设置功能正在开发中，敬请期待...
        </p>
      </div>
    </div>
  )
}