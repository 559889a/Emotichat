"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ChatScreen } from "@/components/chat/chat-screen"
import { useChatController } from "@/hooks/useChatController"

function ChatPageLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

function ChatPageContent() {
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("id")

  const controller = useChatController(conversationId)

  return <ChatScreen controller={controller} />
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageLoading />}>
      <ChatPageContent />
    </Suspense>
  )
}
