"use client"

import { useState, useMemo } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCharacters } from "@/hooks/useCharacters"
import { useConversations } from "@/hooks/useConversations"
import { useConversationStore } from "@/stores/conversation"
import { useRouter } from "next/navigation"

interface NewConversationDialogProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  onSuccess?: () => void
}

export function NewConversationDialog({
  variant = "outline",
  size = "sm",
  className,
  onSuccess,
}: NewConversationDialogProps) {
  const [open, setOpen] = useState(false)
  const [characterId, setCharacterId] = useState("")
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)

  const { characters, loading: charactersLoading } = useCharacters()
  const { createConversation } = useConversations()
  const { setCurrentConversation } = useConversationStore()
  const router = useRouter()

  // 过滤出对话角色（排除用户角色）
  const conversationCharacters = useMemo(() => {
    return characters.filter(char => !char.isUserProfile)
  }, [characters])

  const handleCreate = async () => {
    if (!characterId) return

    setCreating(true)
    try {
      const conversation = await createConversation({
        characterId,
        title: title.trim() || undefined,
      })

      if (conversation) {
        // 设置为当前对话
        setCurrentConversation(conversation.id)
        
        // 调用成功回调（刷新侧边栏列表）
        if (onSuccess) {
          onSuccess()
        }
        
        // 跳转到聊天页面
        router.push(`/chat?id=${conversation.id}`)
        
        // 重置表单并关闭对话框
        setCharacterId("")
        setTitle("")
        setOpen(false)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!creating) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setCharacterId("")
        setTitle("")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Plus className="h-4 w-4 mr-2" />
          新对话
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建对话</DialogTitle>
          <DialogDescription>
            选择一个角色开始新的对话。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="character">选择角色 *</Label>
            <Select
              value={characterId}
              onValueChange={setCharacterId}
              disabled={charactersLoading || creating}
            >
              <SelectTrigger id="character">
                <SelectValue placeholder="选择一个角色" />
              </SelectTrigger>
              <SelectContent>
                {conversationCharacters.map((char) => (
                  <SelectItem key={char.id} value={char.id}>
                    {char.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {charactersLoading && (
              <p className="text-xs text-muted-foreground">加载角色列表...</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">对话标题（可选）</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="新对话"
              disabled={creating}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={creating}
          >
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!characterId || creating || charactersLoading}
          >
            {creating ? "创建中..." : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}