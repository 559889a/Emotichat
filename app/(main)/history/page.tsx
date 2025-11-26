"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import {
  History,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Trash2,
  Search,
  CheckSquare,
  Square,
  Users,
  Clock,
  MoreVertical,
} from "lucide-react"
import { useConversations, emitConversationsUpdated } from "@/hooks/useConversations"
import { useCharacters } from "@/hooks/useCharacters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { toast } from "sonner"
import type { ConversationSummary } from "@/types/conversation"
import type { Character } from "@/types/character"

interface GroupedConversations {
  character: Character | null
  characterId: string
  conversations: ConversationSummary[]
}

export default function HistoryPage() {
  const { conversations, loading, refetch } = useConversations()
  const { characters } = useCharacters()

  const [searchQuery, setSearchQuery] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const initializedRef = useRef(false)

  // 按角色分组对话
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((conv) =>
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groups: Map<string, GroupedConversations> = new Map()

    filtered.forEach((conv) => {
      const charId = conv.characterId || "unknown"
      if (!groups.has(charId)) {
        const char = characters.find((c) => c.id === charId) || null
        groups.set(charId, {
          character: char,
          characterId: charId,
          conversations: [],
        })
      }
      groups.get(charId)!.conversations.push(conv)
    })

    // 按对话数量排序
    return Array.from(groups.values()).sort(
      (a, b) => b.conversations.length - a.conversations.length
    )
  }, [conversations, characters, searchQuery])

  // 初始展开所有分组（仅首次加载时）
  useEffect(() => {
    if (!initializedRef.current && groupedConversations.length > 0) {
      setExpandedGroups(new Set(groupedConversations.map((g) => g.characterId)))
      initializedRef.current = true
    }
  }, [groupedConversations])

  // 切换分组展开状态
  const toggleGroup = (characterId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(characterId)) {
      newExpanded.delete(characterId)
    } else {
      newExpanded.add(characterId)
    }
    setExpandedGroups(newExpanded)
  }

  // 切换选择
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // 全选/取消全选某个分组
  const toggleSelectGroup = (conversations: ConversationSummary[]) => {
    const groupIds = conversations.map((c) => c.id)
    const allSelected = groupIds.every((id) => selectedIds.has(id))

    const newSelected = new Set(selectedIds)
    if (allSelected) {
      groupIds.forEach((id) => newSelected.delete(id))
    } else {
      groupIds.forEach((id) => newSelected.add(id))
    }
    setSelectedIds(newSelected)
  }

  // 删除单个对话
  const deleteConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("删除失败")
      }

      toast.success("对话已删除")
      refetch()
      emitConversationsUpdated() // 通知其他组件刷新（如侧边栏、主页）
    } catch (error) {
      toast.error("删除失败，请重试")
    }
  }

  // 批量删除
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return

    setIsDeleting(true)
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/conversations/${id}`, { method: "DELETE" })
      )
      await Promise.all(promises)

      toast.success(`已删除 ${selectedIds.size} 个对话`)
      setSelectedIds(new Set())
      setIsBatchMode(false)
      refetch()
      emitConversationsUpdated() // 通知其他组件刷新（如侧边栏、主页）
    } catch (error) {
      toast.error("部分删除失败，请重试")
    } finally {
      setIsDeleting(false)
    }
  }

  // 格式化相对时间
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">聊天记录</h1>
              <p className="text-sm text-muted-foreground">
                共 {conversations.length} 个对话
              </p>
            </div>
          </div>

          {/* 批量管理按钮 */}
          <div className="flex items-center gap-2">
            {isBatchMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsBatchMode(false)
                    setSelectedIds(new Set())
                  }}
                >
                  取消
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={selectedIds.size === 0 || isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除 ({selectedIds.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要删除选中的 {selectedIds.size} 个对话吗？此操作无法撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteSelected}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBatchMode(true)}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                批量管理
              </Button>
            )}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索对话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 对话分组列表 */}
        {groupedConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {searchQuery ? "没有找到匹配的对话" : "暂无聊天记录"}
            </h3>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {searchQuery ? "尝试其他关键词" : "开始新对话后这里会显示记录"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedConversations.map((group) => (
              <Collapsible
                key={group.characterId}
                open={expandedGroups.has(group.characterId)}
                onOpenChange={() => toggleGroup(group.characterId)}
              >
                {/* 分组标题 */}
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start px-3 py-2 h-auto hover:bg-accent"
                    >
                      {expandedGroups.has(group.characterId) ? (
                        <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                      )}
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-primary font-medium mr-2 shrink-0">
                        {group.character?.name.charAt(0).toUpperCase() || (
                          <Users className="h-4 w-4" />
                        )}
                      </div>
                      <span className="font-medium truncate">
                        {group.character?.name || "未知角色"}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {group.conversations.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>

                  {/* 批量选择分组 */}
                  {isBatchMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSelectGroup(group.conversations)}
                      className="shrink-0"
                    >
                      {group.conversations.every((c) => selectedIds.has(c.id)) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* 对话列表 */}
                <CollapsibleContent className="mt-2 ml-6 space-y-2">
                  {group.conversations
                    .sort(
                      (a, b) =>
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime()
                    )
                    .map((conv) => (
                      <div
                        key={conv.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          selectedIds.has(conv.id)
                            ? "bg-primary/5 border-primary/30"
                            : "bg-card hover:bg-accent"
                        }`}
                      >
                        {/* 选择框 */}
                        {isBatchMode && (
                          <button
                            onClick={() => toggleSelect(conv.id)}
                            className="shrink-0"
                          >
                            {selectedIds.has(conv.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                        )}

                        {/* 对话信息 */}
                        <Link
                          href={`/chat?id=${conv.id}`}
                          className="flex-1 min-w-0"
                        >
                          <h4 className="font-medium text-sm truncate hover:text-primary transition-colors">
                            {conv.title || "新对话"}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {conv.messageCount || 0} 条消息
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(conv.updatedAt)}
                            </span>
                          </div>
                        </Link>

                        {/* 操作菜单 */}
                        {!isBatchMode && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/chat?id=${conv.id}`}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  继续对话
                                </Link>
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除对话
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      确定要删除对话 &ldquo;{conv.title || "新对话"}&rdquo; 吗？此操作无法撤销。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteConversation(conv.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      确认删除
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
