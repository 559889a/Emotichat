"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Users, Settings, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-background border-r">
      {/* Logo 和应用名称 */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <Heart className="h-6 w-6 text-pink-500" />
        <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          EmotiChat
        </span>
      </div>

      {/* 导航链接 */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* 底部：主题切换 */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">主题</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}