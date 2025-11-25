'use client';

import * as React from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Brain, Type, Code, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useUIPreferences,
  ThinkingTagConfig,
  SpecialFieldRule,
} from '@/stores/uiPreferences';
import { fetchModelsFromCustomProvider } from '@/lib/ai/models';

// 思维链标签编辑组件
function ThinkingTagItem({
  tag,
  onUpdate,
  onRemove,
  isBuiltIn,
}: {
  tag: ThinkingTagConfig;
  onUpdate: (updates: Partial<Omit<ThinkingTagConfig, 'id'>>) => void;
  onRemove: () => void;
  isBuiltIn: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <Switch
        checked={tag.enabled}
        onCheckedChange={(enabled) => onUpdate({ enabled })}
      />
      <div className="flex-1 grid grid-cols-2 gap-2">
        <Input
          value={tag.openTag}
          onChange={(e) => onUpdate({ openTag: e.target.value })}
          placeholder="开始标签"
          className="font-mono text-sm"
          disabled={isBuiltIn}
        />
        <Input
          value={tag.closeTag}
          onChange={(e) => onUpdate({ closeTag: e.target.value })}
          placeholder="结束标签"
          className="font-mono text-sm"
          disabled={isBuiltIn}
        />
      </div>
      {!isBuiltIn && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// 特殊字段规则编辑组件
function SpecialFieldRuleItem({
  rule,
  onUpdate,
  onRemove,
  isBuiltIn,
}: {
  rule: SpecialFieldRule;
  onUpdate: (updates: Partial<Omit<SpecialFieldRule, 'id'>>) => void;
  onRemove: () => void;
  isBuiltIn: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <Switch
          checked={rule.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{rule.name}</span>
          <code className="text-xs bg-muted px-2 py-0.5 rounded ml-auto">
            {rule.pattern}
          </code>
        </button>
        {!isBuiltIn && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isExpanded && (
        <div className="p-3 pt-0 border-t space-y-3">
          <div className="grid gap-2">
            <Label>规则名称</Label>
            <Input
              value={rule.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="规则名称"
            />
          </div>
          <div className="grid gap-2">
            <Label>正则表达式</Label>
            <Input
              value={rule.pattern}
              onChange={(e) => onUpdate({ pattern: e.target.value })}
              placeholder="正则表达式模式"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              使用捕获组 () 来匹配需要高亮的内容
            </p>
          </div>
          <div className="grid gap-2">
            <Label>CSS 类名</Label>
            <Input
              value={rule.className}
              onChange={(e) => onUpdate({ className: e.target.value })}
              placeholder="CSS 类名"
              className="font-mono text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label>内联样式</Label>
            <Input
              value={rule.style || ''}
              onChange={(e) => onUpdate({ style: e.target.value })}
              placeholder="如：background-color: yellow; color: black;"
              className="font-mono text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>保留分隔符</Label>
              <p className="text-xs text-muted-foreground">
                开启后显示完整内容（如 "你好"），关闭则只显示内部内容（如 你好）
              </p>
            </div>
            <Switch
              checked={rule.keepDelimiters}
              onCheckedChange={(checked) => onUpdate({ keepDelimiters: checked })}
            />
          </div>
          {/* 预览效果 */}
          <div className="grid gap-2">
            <Label>预览效果</Label>
            <div className="p-3 rounded border bg-muted/50">
              <span
                className={rule.className}
                style={rule.style ? Object.fromEntries(
                  rule.style.split(';')
                    .filter(s => s.trim())
                    .map(s => {
                      const [key, value] = s.split(':').map(x => x.trim());
                      return [key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value];
                    })
                ) : undefined}
              >
                示例文本 Example Text
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 添加新的思维链标签对话框
function AddThinkingTagForm({ onAdd }: { onAdd: (tag: Omit<ThinkingTagConfig, 'id'>) => void }) {
  const [openTag, setOpenTag] = React.useState('');
  const [closeTag, setCloseTag] = React.useState('');

  const handleAdd = () => {
    if (openTag && closeTag) {
      onAdd({ openTag, closeTag, enabled: true });
      setOpenTag('');
      setCloseTag('');
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed">
      <Input
        value={openTag}
        onChange={(e) => setOpenTag(e.target.value)}
        placeholder="<custom>"
        className="font-mono text-sm"
      />
      <Input
        value={closeTag}
        onChange={(e) => setCloseTag(e.target.value)}
        placeholder="</custom>"
        className="font-mono text-sm"
      />
      <Button
        variant="outline"
        size="icon"
        onClick={handleAdd}
        disabled={!openTag || !closeTag}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// 添加新的特殊字段规则对话框
function AddSpecialFieldRuleForm({
  onAdd,
}: {
  onAdd: (rule: Omit<SpecialFieldRule, 'id'>) => void;
}) {
  const [name, setName] = React.useState('');
  const [pattern, setPattern] = React.useState('');

  const handleAdd = () => {
    if (name && pattern) {
      onAdd({
        name,
        pattern,
        enabled: true,
        className: `special-field-custom-${Date.now()}`,
        style: 'background-color: rgba(100, 100, 100, 0.2); padding: 0 2px; border-radius: 2px;',
        keepDelimiters: true,
      });
      setName('');
      setPattern('');
    }
  };

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
        <Button
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!name || !pattern}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        示例：匹配中括号内容使用 \[([^\]]+)\]
      </p>
    </div>
  );
}

// 协议类型说明
const protocolDescriptions: Record<string, string> = {
  openai: 'OpenAI 兼容 API → 请求路径：您的URL + /v1/chat/completions',
  gemini: 'Google Gemini API → 请求路径：您的URL + /v1beta',
  anthropic: 'Anthropic Claude API → 请求路径：您的URL + /v1/messages',
};

// 主设置组件
export function RenderingSettings() {
  const {
    thinkingCollapsed,
    setThinkingCollapsed,
    thinkingAutoComplete,
    setThinkingAutoComplete,
    thinkingLLMAssist,
    setThinkingLLMAssist,
    thinkingLLMProtocol,
    setThinkingLLMProtocol,
    thinkingLLMEndpoint,
    setThinkingLLMEndpoint,
    thinkingLLMApiKey,
    setThinkingLLMApiKey,
    thinkingLLMModel,
    setThinkingLLMModel,
    thinkingTags,
    addThinkingTag,
    removeThinkingTag,
    updateThinkingTag,
    specialFieldRules,
    addSpecialFieldRule,
    removeSpecialFieldRule,
    updateSpecialFieldRule,
    enableHtmlRendering,
    setEnableHtmlRendering,
  } = useUIPreferences();

  // LLM 连接测试状态
  const [isTesting, setIsTesting] = React.useState(false);
  const [isFetchingModels, setIsFetchingModels] = React.useState(false);
  const [fetchedModels, setFetchedModels] = React.useState<string[]>([]);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 测试 LLM 连接并拉取模型
  const handleTestConnection = async () => {
    if (!thinkingLLMEndpoint || !thinkingLLMApiKey) {
      setTestResult({
        success: false,
        message: '请填写端点地址和 API Key',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setFetchedModels([]);

    try {
      // 先测试连接（如果有模型名称）
      if (thinkingLLMModel) {
        const response = await fetch('/api/thinking-assist', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocol: thinkingLLMProtocol,
            endpoint: thinkingLLMEndpoint,
            apiKey: thinkingLLMApiKey,
            model: thinkingLLMModel,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          setTestResult({
            success: false,
            message: result.error || '连接测试失败',
          });
          setIsTesting(false);
          return;
        }
      }

      // 拉取模型列表
      setIsFetchingModels(true);
      const modelsResult = await fetchModelsFromCustomProvider(
        thinkingLLMEndpoint,
        thinkingLLMApiKey,
        thinkingLLMProtocol
      );

      if (modelsResult.success && modelsResult.models) {
        setFetchedModels(modelsResult.models);
        setTestResult({
          success: true,
          message: `连接成功！拉取到 ${modelsResult.models.length} 个模型`,
        });

        // 成功时 3 秒后自动隐藏提示
        setTimeout(() => setTestResult(null), 3000);
      } else {
        setTestResult({
          success: true,
          message: '连接成功，但无法拉取模型列表（可能不支持）',
        });

        // 3 秒后自动隐藏
        setTimeout(() => setTestResult(null), 3000);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '连接测试失败',
      });
    } finally {
      setIsTesting(false);
      setIsFetchingModels(false);
    }
  };

  // 从拉取的模型列表中选择模型
  const handleSelectModel = (model: string) => {
    setThinkingLLMModel(model);
  };

  const [thinkingOpen, setThinkingOpen] = React.useState(true);
  const [specialFieldsOpen, setSpecialFieldsOpen] = React.useState(true);

  // 内置标签 ID
  const builtInTagIds = ['think', 'thinking', 'thought'];
  const builtInRuleIds = ['double-quotes', 'parentheses', 'asterisk-action'];

  return (
    <div className="space-y-6">
      {/* 思维链折叠设置 */}
      <Card>
        <Collapsible open={thinkingOpen} onOpenChange={setThinkingOpen}>
          <CardHeader className="cursor-pointer" onClick={() => setThinkingOpen(!thinkingOpen)}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2">
                {thinkingOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Brain className="h-5 w-5 text-purple-500" />
                <div>
                  <CardTitle>思维链折叠</CardTitle>
                  <CardDescription>
                    自动识别并折叠 AI 模型的思维过程内容
                  </CardDescription>
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* 默认折叠状态 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>默认折叠</Label>
                  <p className="text-sm text-muted-foreground">
                    思维链内容默认显示为折叠状态
                  </p>
                </div>
                <Switch
                  checked={thinkingCollapsed}
                  onCheckedChange={setThinkingCollapsed}
                />
              </div>

              {/* 自动补全 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自动补全标签</Label>
                  <p className="text-sm text-muted-foreground">
                    自动补全缺失的开头或闭合标签（如有 &lt;think&gt; 补 &lt;/think&gt;，或反之）
                  </p>
                </div>
                <Switch
                  checked={thinkingAutoComplete}
                  onCheckedChange={setThinkingAutoComplete}
                />
              </div>

              {/* LLM 辅助识别 */}
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>LLM 辅助识别</Label>
                    <p className="text-sm text-muted-foreground">
                      使用 LLM 判断完全没有标签的内容是否为思维链
                    </p>
                  </div>
                  <Switch
                    checked={thinkingLLMAssist}
                    onCheckedChange={setThinkingLLMAssist}
                  />
                </div>

                {thinkingLLMAssist && (
                  <div className="space-y-4 pt-2">
                    {/* 协议类型 */}
                    <div className="space-y-2">
                      <Label>协议类型</Label>
                      <Select
                        value={thinkingLLMProtocol}
                        onValueChange={(value: 'openai' | 'gemini' | 'anthropic') =>
                          setThinkingLLMProtocol(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI 兼容</SelectItem>
                          <SelectItem value="gemini">Gemini 兼容</SelectItem>
                          <SelectItem value="anthropic">Claude 兼容</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {protocolDescriptions[thinkingLLMProtocol]}
                      </p>
                    </div>

                    {/* Base URL */}
                    <div className="space-y-2">
                      <Label>API 端点地址</Label>
                      <Input
                        value={thinkingLLMEndpoint}
                        onChange={(e) => setThinkingLLMEndpoint(e.target.value)}
                        placeholder="https://api.example.com"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        系统会根据协议类型自动添加请求路径
                      </p>
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={thinkingLLMApiKey}
                        onChange={(e) => setThinkingLLMApiKey(e.target.value)}
                        placeholder="输入 API Key"
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* 测试连接按钮 */}
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting || !thinkingLLMEndpoint || !thinkingLLMApiKey}
                      className="w-full"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isFetchingModels ? '正在拉取模型...' : '测试中...'}
                        </>
                      ) : (
                        '测试连接并拉取模型'
                      )}
                    </Button>

                    {/* 选择模型 */}
                    <div className="space-y-2">
                      <Label>选择模型</Label>
                      {fetchedModels.length > 0 ? (
                        <Select
                          value={thinkingLLMModel}
                          onValueChange={(value) => {
                            if (value === '__custom__') {
                              setThinkingLLMModel('');
                            } else {
                              handleSelectModel(value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="从列表中选择模型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__custom__">手动输入...</SelectItem>
                            {fetchedModels.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          点击上方按钮拉取可用模型列表
                        </p>
                      )}
                    </div>

                    {/* 模型名称（手动输入） */}
                    <div className="space-y-2">
                      <Label>模型名称</Label>
                      <Input
                        value={thinkingLLMModel}
                        onChange={(e) => setThinkingLLMModel(e.target.value)}
                        placeholder={
                          thinkingLLMProtocol === 'openai' ? 'gpt-4o-mini' :
                          thinkingLLMProtocol === 'gemini' ? 'gemini-1.5-flash' :
                          'claude-3-haiku-20240307'
                        }
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        建议使用快速、低成本的模型（此功能调用频繁）
                      </p>
                    </div>

                    {/* 测试结果 */}
                    {testResult && (
                      <Alert variant={testResult.success ? 'default' : 'destructive'}>
                        <div className="flex items-center gap-2">
                          {testResult.success ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          <AlertDescription>{testResult.message}</AlertDescription>
                        </div>
                      </Alert>
                    )}

                    {/* 说明 */}
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>说明：</strong> 当消息内容完全没有思维链标签时，LLM 会判断内容是否为 AI 的内部思考过程（推理、分析等），如果是则自动包裹标签以便折叠显示。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 标签列表 */}
              <div className="space-y-3">
                <Label>识别标签</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  以下 XML 标签将被识别为思维链内容并可折叠显示
                </p>
                <div className="space-y-2">
                  {thinkingTags.map((tag) => (
                    <ThinkingTagItem
                      key={tag.id}
                      tag={tag}
                      onUpdate={(updates) => updateThinkingTag(tag.id, updates)}
                      onRemove={() => removeThinkingTag(tag.id)}
                      isBuiltIn={builtInTagIds.includes(tag.id)}
                    />
                  ))}
                </div>

                {/* 添加自定义标签 */}
                <div className="pt-2">
                  <Label className="text-sm mb-2 block">添加自定义标签</Label>
                  <AddThinkingTagForm onAdd={addThinkingTag} />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* 特殊字段渲染设置 */}
      <Card>
        <Collapsible open={specialFieldsOpen} onOpenChange={setSpecialFieldsOpen}>
          <CardHeader className="cursor-pointer" onClick={() => setSpecialFieldsOpen(!specialFieldsOpen)}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2">
                {specialFieldsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Type className="h-5 w-5 text-blue-500" />
                <div>
                  <CardTitle>特殊字段渲染</CardTitle>
                  <CardDescription>
                    使用正则表达式匹配并高亮显示特定格式的文本
                  </CardDescription>
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* 规则列表 */}
              <div className="space-y-2">
                {specialFieldRules.map((rule) => (
                  <SpecialFieldRuleItem
                    key={rule.id}
                    rule={rule}
                    onUpdate={(updates) => updateSpecialFieldRule(rule.id, updates)}
                    onRemove={() => removeSpecialFieldRule(rule.id)}
                    isBuiltIn={builtInRuleIds.includes(rule.id)}
                  />
                ))}
              </div>

              {/* 添加自定义规则 */}
              <div className="pt-2">
                <Label className="text-sm mb-2 block">添加自定义规则</Label>
                <AddSpecialFieldRuleForm onAdd={addSpecialFieldRule} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* HTML/CSS 渲染设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-green-500" />
            <div>
              <CardTitle>HTML/CSS 渲染</CardTitle>
              <CardDescription>
                允许在消息中渲染 HTML 标签和内联样式
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用 HTML 渲染</Label>
              <p className="text-sm text-muted-foreground">
                开启后可在消息中使用 HTML 标签和 CSS 样式
              </p>
            </div>
            <Switch
              checked={enableHtmlRendering}
              onCheckedChange={setEnableHtmlRendering}
            />
          </div>
          {enableHtmlRendering && (
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-3">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>注意：</strong> 启用 HTML 渲染可能存在安全风险。请仅在信任的环境中使用。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
