"use client"

import { useState } from 'react'
import { X, Copy, Download, AlertCircle, Clock, Zap, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { DevModeData } from '@/types/dev-mode'
import { cn } from '@/lib/utils'

interface DevModePanelProps {
  data: DevModeData | null
  isOpen: boolean
  onClose: () => void
}

export function DevModePanel({ data, isOpen, onClose }: DevModePanelProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'request' | 'response' | 'tokens' | 'performance'>('prompt')

  if (!data || !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-background shadow-2xl border-l">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">开发者模式</h2>
              <Badge variant="outline" className="ml-2">
                {data.conversationId.slice(0, 8)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const json = JSON.stringify(data, null, 2)
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `dev-mode-${data.id}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4" />
                导出
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="border-b px-6">
              <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-4">
                <TabsTrigger value="prompt" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
                  提示词
                </TabsTrigger>
                <TabsTrigger value="request" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
                  请求
                </TabsTrigger>
                <TabsTrigger value="response" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
                  响应
                </TabsTrigger>
                <TabsTrigger value="tokens" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
                  Token
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
                  性能
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="prompt" className="h-full m-0 p-6">
                <ScrollArea className="h-full">
                  <PromptView data={data.promptBuild} />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="request" className="h-full m-0 p-6">
                <ScrollArea className="h-full">
                  <RequestView data={data.apiRequest} />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="response" className="h-full m-0 p-6">
                <ScrollArea className="h-full">
                  {data.apiResponse ? (
                    <ResponseView data={data.apiResponse} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      等待响应...
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="tokens" className="h-full m-0 p-6">
                <ScrollArea className="h-full">
                  <TokenAnalysisView data={data.tokenAnalysis} />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="performance" className="h-full m-0 p-6">
                <ScrollArea className="h-full">
                  <PerformanceView data={data.performance} />
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 提示词视图
// ============================================================================

function PromptView({ data }: { data: DevModeData['promptBuild'] }) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    // TODO: 添加 toast 通知
    console.log(`已复制${label}到剪贴板`)
  }

  return (
    <div className="space-y-4">
      {/* 构建信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>构建信息</span>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {data.duration}ms
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">构建时间:</span>
              <span>{data.timestamp.toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">消息数量:</span>
              <span>{data.processedMessages.length} 条</span>
            </div>
            {data.sources.preset && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">使用预设:</span>
                <span>{data.sources.preset}</span>
              </div>
            )}
            {data.sources.character && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">关联角色:</span>
                <span>{data.sources.character}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 警告信息 */}
      {data.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>警告</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {data.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 处理后的消息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>处理后的消息</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  JSON.stringify(data.processedMessages, null, 2),
                  '消息数组'
                )
              }
            >
              <Copy className="h-4 w-4" />
              复制
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.processedMessages.map((msg, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={msg.role === 'system' ? 'default' : msg.role === 'user' ? 'secondary' : 'outline'}>
                    {msg.role}
                  </Badge>
                  {msg.layer !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      Layer {msg.layer}
                    </span>
                  )}
                </div>
                <pre className="text-xs whitespace-pre-wrap break-words bg-muted p-2 rounded">
                  {msg.content}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 原始提示词项 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>原始提示词项</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  JSON.stringify(data.rawPromptItems, null, 2),
                  '原始提示词项'
                )
              }
            >
              <Copy className="h-4 w-4" />
              复制
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap break-words bg-muted p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data.rawPromptItems, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// 请求视图
// ============================================================================

function RequestView({ data }: { data: DevModeData['apiRequest'] }) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    console.log(`已复制${label}到剪贴板`)
  }

  return (
    <div className="space-y-4">
      {/* 模型信息 */}
      <Card>
        <CardHeader>
          <CardTitle>模型配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Provider:</span>
              <Badge>{data.model.provider}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Model:</span>
              <Badge variant="outline">{data.model.modelId}</Badge>
            </div>
            {data.endpoint && (
              <div className="flex justify-between items-start gap-4">
                <span className="text-sm text-muted-foreground">Endpoint:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                  {data.endpoint}
                </code>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">参数:</div>
            <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(data.model.parameters, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* 请求时间 */}
      <Card>
        <CardHeader>
          <CardTitle>请求信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">请求时间:</span>
              <span>{data.timestamp.toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">消息数量:</span>
              <span>{data.messages.length} 条</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 完整请求体 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>完整请求体</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  JSON.stringify(data.requestBody, null, 2),
                  '请求体'
                )
              }
            >
              <Copy className="h-4 w-4" />
              复制
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data.requestBody, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// 响应视图
// ============================================================================

function ResponseView({ data }: { data: DevModeData['apiResponse'] }) {
  if (data.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>请求错误</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <div><strong>错误消息:</strong> {data.error.message}</div>
            {data.error.code && <div><strong>错误代码:</strong> {data.error.code}</div>}
            {data.error.statusCode && <div><strong>HTTP 状态:</strong> {data.error.statusCode}</div>}
            {data.error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">查看堆栈</summary>
                <pre className="mt-2 text-xs overflow-auto bg-destructive/10 p-2 rounded">
                  {data.error.stack}
                </pre>
              </details>
            )}
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* 响应信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>响应信息</span>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {data.duration}ms
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">响应时间:</span>
              <span>{data.timestamp.toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">响应耗时:</span>
              <span>{data.duration}ms</span>
            </div>
            {data.metadata?.finishReason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">结束原因:</span>
                <Badge variant="outline">{data.metadata.finishReason}</Badge>
              </div>
            )}
            {data.metadata?.model && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">实际模型:</span>
                <span className="font-mono text-xs">{data.metadata.model}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Token 使用 */}
      <Card>
        <CardHeader>
          <CardTitle>Token 使用</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">输入 Tokens:</span>
              <Badge>{data.tokenUsage.promptTokens.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">输出 Tokens:</span>
              <Badge>{data.tokenUsage.completionTokens.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">总计:</span>
              <Badge variant="default">{data.tokenUsage.totalTokens.toLocaleString()}</Badge>
            </div>
            {data.tokenUsage.cachedTokens !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">缓存命中:</span>
                <Badge variant="secondary">{data.tokenUsage.cachedTokens.toLocaleString()}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 响应内容 */}
      {data.content && (
        <Card>
          <CardHeader>
            <CardTitle>响应内容</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap break-words bg-muted p-4 rounded overflow-auto max-h-96">
              {data.content}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* 流式响应块 */}
      {data.chunks && data.chunks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>流式响应 ({data.chunks.length} 块)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {data.chunks.map((chunk, i) => (
                  <div key={i} className="border-b pb-2 last:border-b-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        Chunk {chunk.index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {chunk.timestamp.toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                    <div className="text-sm bg-muted p-2 rounded">
                      {chunk.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// Token 分析视图
// ============================================================================

function TokenAnalysisView({ data }: { data: DevModeData['tokenAnalysis'] }) {
  return (
    <div className="space-y-4">
      {/* 警告信息 */}
      {data.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Token 使用警告</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {data.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 总览 */}
      <Card>
        <CardHeader>
          <CardTitle>Token 使用总览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 总计 */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm text-muted-foreground">总计</span>
                <span className="text-2xl font-bold">
                  {data.total.total.toLocaleString()} tokens
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    data.total.percentage > 90 ? "bg-destructive" :
                    data.total.percentage > 75 ? "bg-orange-500" :
                    "bg-primary"
                  )}
                  style={{ width: `${Math.min(data.total.percentage, 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground text-right">
                {data.total.percentage.toFixed(1)}% / {data.total.limit.toLocaleString()}
              </div>
            </div>

            {/* 输入/输出 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">输入</div>
                <div className="text-xl font-semibold">
                  {data.total.input.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((data.total.input / data.total.total) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">输出</div>
                <div className="text-xl font-semibold">
                  {data.total.output.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((data.total.output / data.total.total) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* 成本估算 */}
            {data.total.estimatedCost && (
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">成本估算</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">输入</div>
                    <div className="font-mono">
                      ${data.total.estimatedCost.input.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">输出</div>
                    <div className="font-mono">
                      ${data.total.estimatedCost.output.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">总计</div>
                    <div className="font-mono font-semibold">
                      ${data.total.estimatedCost.total.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 每条消息详情 */}
      <Card>
        <CardHeader>
          <CardTitle>消息详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.perMessage.map((msg) => (
              <div
                key={msg.messageId}
                className={cn(
                  "rounded-lg border p-3 space-y-2",
                  msg.isTooLong && "border-destructive bg-destructive/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <Badge variant={msg.role === 'system' ? 'default' : msg.role === 'user' ? 'secondary' : 'outline'}>
                    {msg.role}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {msg.tokens.toLocaleString()} tokens
                    </span>
                    {msg.isTooLong && (
                      <Badge variant="destructive" className="text-xs">
                        超长
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {msg.content}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{msg.characters} 字符</span>
                  <span>·</span>
                  <span>{msg.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${msg.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// 性能视图
// ============================================================================

function PerformanceView({ data }: { data: DevModeData['performance'] }) {
  return (
    <div className="space-y-4">
      {/* 总体性能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            性能指标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">提示词构建</div>
                <div className="text-2xl font-bold">{data.promptBuildDuration}ms</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">API 请求</div>
                <div className="text-2xl font-bold">{data.requestDuration}ms</div>
              </div>
            </div>

            {data.firstChunkDuration !== undefined && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">首字节时间 (TTFB)</div>
                <div className="text-2xl font-bold">{data.firstChunkDuration}ms</div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">总耗时</div>
              <div className="text-3xl font-bold">{data.totalDuration}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token 生成速度 */}
      {(data.avgTokenTime !== undefined || data.throughput !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle>生成速度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.avgTokenTime !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">平均每 Token:</span>
                  <Badge variant="outline">{data.avgTokenTime.toFixed(2)}ms</Badge>
                </div>
              )}
              {data.throughput !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">吞吐量:</span>
                  <Badge>{data.throughput.toFixed(1)} tokens/s</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 时间线 */}
      <Card>
        <CardHeader>
          <CardTitle>时间线</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <TimelineItem
              label="提示词构建"
              duration={data.promptBuildDuration}
              total={data.totalDuration}
            />
            <TimelineItem
              label="API 请求"
              duration={data.requestDuration}
              total={data.totalDuration}
            />
            {data.firstChunkDuration !== undefined && (
              <TimelineItem
                label="首字节时间"
                duration={data.firstChunkDuration}
                total={data.totalDuration}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TimelineItem({ label, duration, total }: { label: string; duration: number; total: number }) {
  const percentage = (duration / total) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{duration}ms</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {percentage.toFixed(1)}%
      </div>
    </div>
  )
}