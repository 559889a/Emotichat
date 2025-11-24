"use client"

import { useState, useEffect, useRef } from 'react'
import { Copy, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { DevModeData } from '@/types/dev-mode'
import { cn, maskSensitiveData } from '@/lib/utils'

interface DevModePanelProps {
  /** 是否显示面板 */
  enabled: boolean
  /** 日志数据 */
  logs: DevModeData[]
  /** 当前活动的日志 */
  activeLogId?: string
  /** 清除所有日志 */
  onClearLogs: () => void
}

/**
 * Dev Mode 日志面板
 * 分屏显示在聊天界面右侧（50%宽度）
 */
export function DevModePanel({ 
  enabled, 
  logs, 
  activeLogId,
  onClearLogs 
}: DevModePanelProps) {
  const [selectedLog, setSelectedLog] = useState<DevModeData | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 当有新日志时，选中最新的
  useEffect(() => {
    if (logs.length > 0 && !selectedLog) {
      setSelectedLog(logs[logs.length - 1])
    }
  }, [logs, selectedLog])

  // 自动滚动到最新日志
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs.length])

  if (!enabled) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportLog = (log: DevModeData) => {
    const maskedLog = maskSensitiveData(log)
    const json = JSON.stringify(maskedLog, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dev-log-${log.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="hidden lg:flex flex-col h-full min-h-0 border-l bg-background w-full lg:w-1/2">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Dev Mode</h3>
            <Badge variant="secondary" className="text-xs">
              {logs.length} 条日志
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            等待 API 调用...
          </div>
        ) : (
          <>
            {/* Log 列表 */}
            <div className="flex-shrink-0 border-b">
              <ScrollArea className="h-32">
                <div className="p-2 space-y-1">
                  {logs.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded text-xs hover:bg-accent transition-colors",
                        selectedLog?.id === log.id && "bg-accent"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={log.apiResponse?.error ? 'destructive' : 'default'} className="text-xs">
                          {log.apiRequest.model.modelId}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString('zh-CN', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {log.apiResponse?.error ? log.apiResponse.error.message : `${log.tokenAnalysis.total.total} tokens`}
                      </div>
                    </button>
                  ))}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Log 详情 */}
            {selectedLog && (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* 基本信息 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">请求信息</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportLog(selectedLog)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Provider:</span>
                        <div className="font-mono">{selectedLog.apiRequest.model.provider}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <div className="font-mono text-xs break-all">{selectedLog.apiRequest.model.modelId}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">请求耗时:</span>
                        <div className="font-mono">{selectedLog.performance.requestDuration}ms</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">消息数量:</span>
                        <div className="font-mono">{selectedLog.apiRequest.messages.length} 条</div>
                      </div>
                    </div>
                  </div>

                  {/* 消息列表 - 完整显示所有内容 */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">发送的消息 ({selectedLog.apiRequest.messages.length})</h4>
                    <div className="space-y-2">
                      {selectedLog.apiRequest.messages.map((msg, i) => (
                        <div key={i} className="border rounded-md overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Badge variant={msg.role === 'system' ? 'default' : msg.role === 'user' ? 'secondary' : 'outline'}>
                                {msg.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">#{i}</span>
                              {msg.layer !== undefined && (
                                <span className="text-xs text-muted-foreground">Layer {msg.layer}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {msg.content.length} 字符
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(msg.content)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {/* 移除 max-h-40 限制，完整显示所有内容 */}
                          <div className="px-3 py-2 text-xs whitespace-pre-wrap break-words font-mono bg-background/50">
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 模型参数 */}
                  {selectedLog.apiRequest.model.parameters && Object.keys(selectedLog.apiRequest.model.parameters).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">模型参数</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(selectedLog.apiRequest.model.parameters).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-muted-foreground">{key}:</span>
                            <div className="font-mono">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Token 统计 */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Token 使用</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-muted rounded">
                        <div className="text-muted-foreground">输入</div>
                        <div className="text-lg font-semibold">{selectedLog.tokenAnalysis.total.input}</div>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="text-muted-foreground">输出</div>
                        <div className="text-lg font-semibold">{selectedLog.tokenAnalysis.total.output}</div>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="text-muted-foreground">总计</div>
                        <div className="text-lg font-semibold">{selectedLog.tokenAnalysis.total.total}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      使用率: {selectedLog.tokenAnalysis.total.percentage.toFixed(1)}% / {selectedLog.tokenAnalysis.total.limit.toLocaleString()}
                    </div>
                  </div>

                  {/* 完整请求体（JSON格式） */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">完整请求体（发送给 LLM 的实际内容）</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const maskedBody = maskSensitiveData(selectedLog.apiRequest.requestBody)
                          copyToClipboard(JSON.stringify(maskedBody, null, 2))
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono whitespace-pre">
                      {JSON.stringify(maskSensitiveData(selectedLog.apiRequest.requestBody), null, 2)}
                    </pre>
                  </div>

                  {/* 响应 */}
                  {selectedLog.apiResponse && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">
                          {selectedLog.apiResponse.error ? '错误信息' : '响应'}
                        </h4>
                        {!selectedLog.apiResponse.error && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const content = selectedLog.apiResponse?.content || ''
                              copyToClipboard(content)
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {selectedLog.apiResponse.error ? (
                        <div className="p-3 bg-destructive/10 border border-destructive rounded text-xs">
                          <div className="font-semibold text-destructive mb-1">
                            {selectedLog.apiResponse.error.message}
                          </div>
                          {selectedLog.apiResponse.error.code && (
                            <div className="text-destructive/80">
                              错误代码: {selectedLog.apiResponse.error.code}
                            </div>
                          )}
                          {selectedLog.apiResponse.error.statusCode && (
                            <div className="text-destructive/80">
                              HTTP: {selectedLog.apiResponse.error.statusCode}
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono whitespace-pre-wrap break-words">
                          {selectedLog.apiResponse.content}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* 调试信息：完整日志对象 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">完整调试日志（JSON）</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const maskedLog = maskSensitiveData(selectedLog)
                          copyToClipboard(JSON.stringify(maskedLog, null, 2))
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto font-mono whitespace-pre">
                      {JSON.stringify(maskSensitiveData(selectedLog), null, 2)}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </div>
    </div>
  )
}