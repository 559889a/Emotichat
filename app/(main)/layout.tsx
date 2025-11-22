import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面端侧边栏 - 固定宽度 240px */}
      <aside className="hidden md:flex md:w-60 md:flex-col">
        <Sidebar />
      </aside>

      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 移动端 Header */}
        <Header />

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}