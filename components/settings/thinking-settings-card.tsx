'use client';

import * as React from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ThinkingTagConfig } from '@/stores/uiPreferences';
import { useThinkingLLMTester } from '@/hooks/useThinkingLLMTester';
import { cn } from '@/lib/utils';

interface ThinkingTagItemProps {
  tag: ThinkingTagConfig;
  onUpdate: (updates: Partial<Omit<ThinkingTagConfig, 'id'>>) => void;
  onRemove: () => void;
  isBuiltIn: boolean;
}

function ThinkingTagItem({ tag, onUpdate, onRemove, isBuiltIn }: ThinkingTagItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <Switch checked={tag.enabled} onCheckedChange={(enabled) => onUpdate({ enabled })} />
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
      <Button variant="outline" size="icon" onClick={handleAdd} disabled={!openTag || !closeTag}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ThinkingSettingsCardProps {
  thinkingCollapsed: boolean;
  setThinkingCollapsed: (value: boolean) => void;
  thinkingAutoComplete: boolean;
  setThinkingAutoComplete: (value: boolean) => void;
  thinkingLLMAssist: boolean;
  setThinkingLLMAssist: (value: boolean) => void;
  thinkingLLMProtocol: string;
  setThinkingLLMProtocol: (value: string) => void;
  thinkingLLMEndpoint: string;
  setThinkingLLMEndpoint: (value: string) => void;
  thinkingLLMApiKey: string;
  setThinkingLLMApiKey: (value: string) => void;
  thinkingLLMModel: string;
  setThinkingLLMModel: (value: string) => void;
  thinkingTags: ThinkingTagConfig[];
  addThinkingTag: (tag: Omit<ThinkingTagConfig, 'id'>) => void;
  removeThinkingTag: (id: string) => void;
  updateThinkingTag: (id: string, updates: Partial<Omit<ThinkingTagConfig, 'id'>>) => void;
}

export function ThinkingSettingsCard({
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
}: ThinkingSettingsCardProps) {
  const [thinkingOpen, setThinkingOpen] = React.useState(true);
  const builtInTagIds = ['think', 'thinking', 'thought'];

  const {
    isTesting,
    isFetchingModels,
    fetchedModels,
    testResult,
    handleTestConnection,
    handleSelectModel,
    setTestResult,
  } = useThinkingLLMTester({
    protocol: thinkingLLMProtocol,
    endpoint: thinkingLLMEndpoint,
    apiKey: thinkingLLMApiKey,
    model: thinkingLLMModel,
    onSelectModel: setThinkingLLMModel,
  });

  return (
    <Card>
      <Collapsible open={thinkingOpen} onOpenChange={setThinkingOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setThinkingOpen(!thinkingOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2">
              {thinkingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <CardTitle>思维链折叠</CardTitle>
                <CardDescription>管理模型回复中的思维标签并控制折叠展示。</CardDescription>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>默认折叠</Label>
                <p className="text-sm text-muted-foreground">思维链内容默认折叠，需要时再展开。</p>
              </div>
              <Switch checked={thinkingCollapsed} onCheckedChange={setThinkingCollapsed} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>自动补全标签</Label>
                <p className="text-sm text-muted-foreground">补全缺失的开头或结尾标签。</p>
              </div>
              <Switch checked={thinkingAutoComplete} onCheckedChange={setThinkingAutoComplete} />
            </div>

            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>LLM 辅助识别</Label>
                  <p className="text-sm text-muted-foreground">尝试识别没有标签的思维链内容（已禁用）。</p>
                </div>
                <Switch
                  checked={thinkingLLMAssist}
                  disabled
                  aria-disabled
                  onCheckedChange={setThinkingLLMAssist}
                />
              </div>
              <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-50">
                <AlertDescription>LLM 辅助识别暂未开放，开关已锁定。</AlertDescription>
              </Alert>
            </div>

            <div className="space-y-3">
              <Label>识别标签</Label>
              <p className="text-sm text-muted-foreground mb-2">
                以下 XML 风格标签会被识别为思维链并可折叠。
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

              <div className="pt-2">
                <Label className="text-sm mb-2 block">添加自定义标签</Label>
                <AddThinkingTagForm onAdd={addThinkingTag} />
              </div>
            </div>

            {testResult && (
              <div
                className={cn(
                  'text-sm rounded-md p-3 border',
                  testResult.success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                )}
              >
                {testResult.message}
              </div>
            )}

            {(isTesting || isFetchingModels) && (
              <div className="text-xs text-muted-foreground">
                {isTesting ? '正在测试连接...' : '正在拉取模型列表...'}
              </div>
            )}

            {fetchedModels.length > 0 && (
              <div className="space-y-2">
                <Label>可用模型</Label>
                <div className="flex flex-wrap gap-2">
                  {fetchedModels.map((model) => (
                    <Button
                      key={model}
                      variant={model === thinkingLLMModel ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSelectModel(model)}
                    >
                      {model}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="hidden">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || isFetchingModels || !thinkingLLMEndpoint || !thinkingLLMApiKey}
              >
                测试连接
              </Button>
              <Button variant="ghost" onClick={() => setTestResult(null)}>
                清除提示
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
