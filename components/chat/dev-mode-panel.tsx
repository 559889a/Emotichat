"use client"

import { useState, useEffect, useRef } from 'react'
import { Copy, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { DevModeData } from '@/types/dev-mode'
import { cn, maskSensitiveData } from '@/lib/utils'

interface DevModePanelProps {
  enabled: boolean
  logs: DevModeData[]
  activeLogId?: string
  onClearLogs: () => void
}

const viewTabs = [
  { key: 'summary', label: '摘要' },
  { key: 'request', label: '请求' },
  { key: 'response', label: '响应' },
  { key: 'tokens', label: '性能/Token' },
  { key: 'raw', label: 'JSON' },
] as const

type ViewTabKey = (typeof viewTabs)[number]['key']

export function DevModePanel({ enabled, logs, activeLogId, onClearLogs }: DevModePanelProps) {
  const [selectedLog, setSelectedLog] = useState<DevModeData | null>(null)
  const [viewTab, setViewTab] = useState<ViewTabKey>('summary')
  const [filter, setFilter] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const filteredLogs = logs.filter((log) => {
    if (!filter.trim()) return true
    const keyword = filter.toLowerCase()
    return (
      log.apiRequest.model.modelId.toLowerCase().includes(keyword) ||
      log.apiRequest.model.provider.toLowerCase().includes(keyword) ||
      log.apiResponse?.error?.message?.toLowerCase().includes(keyword)
    )
  })

  useEffect(() => {
    if (filteredLogs.length === 0) {
      setSelectedLog(null)
      return
    }
    if (activeLogId) {
      const target = filteredLogs.find((log) => log.id === activeLogId)
      if (target) {
        setSelectedLog(target)
        return
      }
    }
    if (!selectedLog || !filteredLogs.find((log) => log.id === selectedLog.id)) {
      setSelectedLog(filteredLogs[filteredLogs.length - 1])
    }
  }, [filteredLogs, activeLogId, selectedLog])

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
    <div className="hidden lg:flex flex-col min-h-0 border-l bg-background w-full lg:w-1/2 lg:h-full overflow-hidden">
      <div className="flex-shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Dev Mode</h3>
            <Badge variant="secondary" className="text-xs">
              {filteredLogs.length} 条日志
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="按模型/错误过滤"
              className="h-8 w-[180px]"
            />
            <Button variant="ghost" size="sm" onClick={onClearLogs} disabled={logs.length === 0}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            等待 API 调用...
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 border-b">
              <ScrollArea className="h-32">
                <div className="p-2 space-y-1">
                  {filteredLogs.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded text-xs hover:bg-accent transition-colors',
                        selectedLog?.id === log.id && 'bg-accent'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant={log.apiResponse?.error ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {log.apiRequest.model.modelId}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {log.apiResponse?.error
                          ? log.apiResponse.error.message
                          : `${log.tokenAnalysis.total.total} tokens`}
                      </div>
                    </button>
                  ))}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            </div>

            {selectedLog && (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {selectedLog.apiRequest.model.provider} · {selectedLog.apiRequest.model.modelId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedLog.apiRequest.messages.length} 条消息 · {selectedLog.performance.requestDuration}ms
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {viewTabs.map((tab) => (
                        <Button
                          key={tab.key}
                          size="sm"
                          variant={viewTab === tab.key ? 'default' : 'outline'}
                          onClick={() => setViewTab(tab.key)}
                        >
                          {tab.label}
                        </Button>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => exportLog(selectedLog)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {viewTab === 'summary' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Provider:</span>
                          <div className="font-mono">{selectedLog.apiRequest.model.provider}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">创建时间:</span>
                          <div className="font-mono">
                            {new Date(selectedLog.createdAt).toLocaleTimeString('zh-CN', { hour12: false })}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">耗时:</span>
                          <div className="font-mono">{selectedLog.performance.requestDuration}ms</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">消息数:</span>
                          <div className="font-mono">{selectedLog.apiRequest.messages.length}</div>
                        </div>
                      </div>
                      {selectedLog.promptBuild.warnings.length > 0 && (
                        <div className="p-2 rounded bg-amber-50 text-amber-700 text-xs border border-amber-200">
                          {selectedLog.promptBuild.warnings.join('；')}
                        </div>
                      )}
                    </div>
                  )}

                  {viewTab === 'request' && (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">模型:</span>
                          <div className="font-mono break-all">{selectedLog.apiRequest.model.modelId}</div>
                        </div>
                        {selectedLog.apiRequest.model.parameters &&
                          Object.keys(selectedLog.apiRequest.model.parameters).length > 0 && (
                            <div className="col-span-2 grid grid-cols-2 gap-2">
                              {Object.entries(selectedLog.apiRequest.model.parameters).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-muted-foreground">{key}:</span>
                                  <div className="font-mono break-all">{String(value)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {viewTab === 'response' && (
                    <div className="space-y-2 text-xs">
                      {selectedLog.apiResponse?.error ? (
                        <div className="p-3 bg-destructive/10 border border-destructive rounded">
                          <div className="font-semibold text-destructive mb-1">
                            {selectedLog.apiResponse.error.message}
                          </div>
                          {selectedLog.apiResponse.error.code && <div>错误代码: {selectedLog.apiResponse.error.code}</div>}
                          {selectedLog.apiResponse.error.statusCode && (
                            <div>HTTP: {selectedLog.apiResponse.error.statusCode}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">暂无响应信息（流式未回填）。</div>
                      )}
                    </div>
                  )}

                  {viewTab === 'tokens' && (
                    <div className="space-y-2">
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
                        使用率 {selectedLog.tokenAnalysis.total.percentage.toFixed(1)}% /{' '}
                        {selectedLog.tokenAnalysis.total.limit.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {viewTab === 'raw' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">完整请求体</h4>
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
                      <p className="text-xs text-muted-foreground">
                        注：变量（如 {`{{char}}`}）在后端处理，此处显示原始内容。
                      </p>
                      <pre className="text-xs bg-muted p-3 rounded font-mono whitespace-pre-wrap break-words overflow-auto">
                        {JSON.stringify(maskSensitiveData(selectedLog.apiRequest.requestBody), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </div>
    </div>
  )
}
