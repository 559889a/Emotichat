"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Users, Settings, Heart, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { useUIPreferences } from "@/stores/uiPreferences"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SheetClose } from "@/components/ui/sheet"

const navigation = [
  {
    name: "聊天",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    name: "角色",
    href: "/characters",
    icon: Users,
  },
  {
    name: "设置",
    href: "/settings",
    icon: Settings,
  },
]

interface SidebarProps {
  isInSheet?: boolean  // 是否在 Sheet 内部
}

export function Sidebar({ isInSheet = false }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIPreferences()

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-background border-r transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo 和应用名称 */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <div className="flex items-center gap-2 overflow-hidden">
          <Heart className="h-6 w-6 text-pink-500 flex-shrink-0" />
          <span className={cn(
            "text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent whitespace-nowrap",
            // 移动端始终显示，桌面端根据折叠状态决定
            sidebarCollapsed && "md:hidden"
          )}>
            EmotiChat
          </span>
        </div>
        
        {/* 移动端：Sheet 关闭按钮（只在 Sheet 内部时渲染） */}
        {isInSheet && (
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <ChevronsLeft className="h-4 w-4" />
              <span className="sr-only">关闭菜单</span>
            </Button>
          </SheetClose>
        )}
        
        {/* 桌面端：折叠按钮（只在非 Sheet 时渲染） */}
        {!isInSheet && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 flex-shrink-0"
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* 导航链接 */}
      <nav className="flex-1 space-y-1 p-2">
        <TooltipProvider>
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  sidebarCollapsed && "justify-center"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            )

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {navLink}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return navLink
          })}
        </TooltipProvider>
      </nav>

      {/* 底部：主题切换 */}
      <div className="border-t p-4">
        <div className={cn(
          "flex items-center",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          {!sidebarCollapsed && (
            <span className="text-sm text-muted-foreground">主题</span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}