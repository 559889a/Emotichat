"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { applyRegexRules } from "@/lib/regex/engine"
import { useRegexRules } from "@/hooks/useRegexRules"
import type { RegexRule } from "@/types/regex"
import { cn } from "@/lib/utils"
import { Loader2, Plus, ScanSearch, Trash2, ChevronDown, ChevronRight, Save, RefreshCw } from "lucide-react"

interface RegexRuleItemProps {
  rule: RegexRule
  onUpdate: (updates: Partial<RegexRule>) => void
  onRemove: () => void
}

function RegexRuleItem({ rule, onUpdate, onRemove }: RegexRuleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [testInput, setTestInput] = useState("")

  const preview = useMemo(() => {
    if (!testInput) return null
    return applyRegexRules(testInput, [rule], { scope: rule.scopes[0] || "user_input" })
  }, [rule, testInput])

  const toggleScope = (scope: "user_input" | "ai_output") => {
    const has = rule.scopes.includes(scope)
    const nextScopes = has ? rule.scopes.filter((s) => s !== scope) : [...rule.scopes, scope]
    onUpdate({ scopes: nextScopes })
  }

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", !rule.enabled && "opacity-60")}>
      {/* 折叠头部 */}
      <div className="flex items-center gap-3 p-3">
        <Switch checked={rule.enabled} onCheckedChange={(enabled) => onUpdate({ enabled })} />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium truncate">{rule.name}</span>
          <code className="text-xs bg-muted px-2 py-0.5 rounded ml-auto shrink-0 max-w-[200px] truncate">
            {rule.pattern || "(空)"}
          </code>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-destructive hover:text-destructive shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="p-3 pt-0 border-t space-y-4">
          {/* 基本信息 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input
                value={rule.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="例如：替换表情短码"
              />
            </div>
            <div className="space-y-2">
              <Label>标签描述</Label>
              <Input
                value={rule.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="用于识别的简短描述"
              />
            </div>
          </div>

          {/* 正则表达式 */}
          <div className="space-y-2">
            <Label>正则表达式</Label>
            <Input
              value={rule.pattern}
              onChange={(e) => onUpdate({ pattern: e.target.value })}
              placeholder="例如：\\[([^\\]]+)\\]"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">使用捕获组 () 来匹配内容，支持 $1 $2 等引用。</p>
          </div>

          {/* 标志位和替换 */}
          <div className="grid gap-3 sm:grid-cols-[100px,1fr]">
            <div className="space-y-2">
              <Label>标志位</Label>
              <Select value={rule.flags || "g"} onValueChange={(v) => onUpdate({ flags: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="g" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="gi">gi</SelectItem>
                  <SelectItem value="gim">gim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>替换为</Label>
              <Input
                value={rule.replacement}
                onChange={(e) => onUpdate({ replacement: e.target.value })}
                placeholder="支持分组引用，如 $1"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* 作用范围 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>作用范围</Label>
              <p className="text-xs text-muted-foreground">选择规则应用的目标。</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.scopes.includes("user_input")}
                  onCheckedChange={() => toggleScope("user_input")}
                />
                <span className="text-sm">用户输入</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.scopes.includes("ai_output")}
                  onCheckedChange={() => toggleScope("ai_output")}
                />
                <span className="text-sm">AI 输出</span>
              </div>
            </div>
          </div>

          {/* 模式 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>模式</Label>
              <p className="text-xs text-muted-foreground">都不勾选则为实际修改。</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.mode === "display_only" || rule.mode === "display_and_prompt"}
                  onCheckedChange={(checked) => {
                    const hasPrompt = rule.mode === "prompt_only" || rule.mode === "display_and_prompt"
                    onUpdate({ mode: checked ? (hasPrompt ? "display_and_prompt" : "display_only") : (hasPrompt ? "prompt_only" : "rewrite") })
                  }}
                />
                <span className="text-sm">仅格式显示</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.mode === "prompt_only" || rule.mode === "display_and_prompt"}
                  onCheckedChange={(checked) => {
                    const hasDisplay = rule.mode === "display_only" || rule.mode === "display_and_prompt"
                    onUpdate({ mode: checked ? (hasDisplay ? "display_and_prompt" : "prompt_only") : (hasDisplay ? "display_only" : "rewrite") })
                  }}
                />
                <span className="text-sm">仅格式提示词</span>
              </div>
            </div>
          </div>

          {/* 楼层限制 */}
          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-2">
              <Label>最小楼层</Label>
              <Input
                type="number"
                min={0}
                value={rule.minLayer ?? ""}
                onChange={(e) => onUpdate({ minLayer: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="默认不限"
              />
            </div>
            <div className="space-y-2">
              <Label>最大楼层</Label>
              <Input
                type="number"
                min={0}
                value={rule.maxLayer ?? ""}
                onChange={(e) => onUpdate({ maxLayer: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="默认不限"
              />
            </div>
          </div>

          {/* 预览测试 */}
          <div className="space-y-2">
            <Label>预览测试</Label>
            <Textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="输入示例文本，预览替换结果"
              className="font-mono text-sm"
              rows={2}
            />
            {preview && (
              <div className="p-3 rounded border bg-muted/50 space-y-2">
                <div className="text-xs text-muted-foreground">命中规则：{preview.matchedRuleIds.length}</div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">输出给 AI：</p>
                  <p className="text-sm whitespace-pre-wrap rounded bg-background p-2">{preview.content}</p>
                  {preview.displayContent && (
                    <>
                      <p className="text-xs font-medium">展示给用户：</p>
                      <p className="text-sm whitespace-pre-wrap rounded bg-background p-2">{preview.displayContent}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AddRegexRuleForm({ onAdd }: { onAdd: (rule: RegexRule) => void }) {
  const [name, setName] = useState("")
  const [pattern, setPattern] = useState("")

  const handleAdd = () => {
    if (name && pattern) {
      const now = new Date().toISOString()
      onAdd({
        id: crypto.randomUUID(),
        name,
        description: "",
        pattern,
        flags: "g",
        replacement: "",
        scopes: ["user_input"],
        mode: "rewrite",
        enabled: true,
        minLayer: null,
        maxLayer: null,
        createdAt: now,
        updatedAt: now,
      })
      setName("")
      setPattern("")
    }
  }

  return (
    <div className="p-3 rounded-lg border border-dashed space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="规则名称"
          className="flex-1"
        />
        <Input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="正则表达式"
          className="flex-1 font-mono text-sm"
        />
        <Button variant="outline" size="icon" onClick={handleAdd} disabled={!name || !pattern}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">示例：\\[([^\\]]+)\\] 匹配方括号内容。</p>
    </div>
  )
}

export function RegexManager() {
  const { rules, loading, error, refresh, setRules } = useRegexRules()
  const [isOpen, setIsOpen] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleUpdate = (id: string, updates: Partial<RegexRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    )
  }

  const handleAdd = (rule: RegexRule) => {
    setRules((prev) => [...prev, rule])
  }

  const handleRemove = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const normalized = rules.map((rule) => ({
        ...rule,
        updatedAt: new Date().toISOString(),
      }))
      const res = await fetch("/api/regex-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: normalized }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "保存失败")
      }
      await refresh()
    } catch (err) {
      console.error("[regex] save failed", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <ScanSearch className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <CardTitle>正则表达式管理</CardTitle>
                <CardDescription>作用于用户输入与 AI 输出的后处理规则。</CardDescription>
              </div>
            </div>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleSaveAll}
              disabled={saving || loading || rules.length === 0}
            >
              <Save className="h-4 w-4" />
              <span className="ml-1">{saving ? "保存中" : "保存"}</span>
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载规则...
              </div>
            ) : (
              <>
                {/* 规则列表 */}
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <RegexRuleItem
                      key={rule.id}
                      rule={rule}
                      onUpdate={(updates) => handleUpdate(rule.id, updates)}
                      onRemove={() => handleRemove(rule.id)}
                    />
                  ))}
                </div>

                {/* 添加新规则 */}
                <div className="pt-2">
                  <Label className="text-sm mb-2 block">添加新规则</Label>
                  <AddRegexRuleForm onAdd={handleAdd} />
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
