import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex md:flex-col">
        <Sidebar />
      </aside>

      {/* 主内容区域 - 移动端占满全宽，桌面端占据剩余空间 */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* 移动端 Header */}
        <Header />

        {/* 页面内容 */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  )
}