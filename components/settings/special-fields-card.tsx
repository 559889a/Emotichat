'use client';

import * as React from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SpecialFieldRule } from '@/stores/uiPreferences';

interface SpecialFieldRuleItemProps {
  rule: SpecialFieldRule;
  onUpdate: (updates: Partial<Omit<SpecialFieldRule, 'id'>>) => void;
  onRemove: () => void;
  isBuiltIn: boolean;
}

function SpecialFieldRuleItem({ rule, onUpdate, onRemove, isBuiltIn }: SpecialFieldRuleItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <Switch checked={rule.enabled} onCheckedChange={(enabled) => onUpdate({ enabled })} />
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 flex-1 text-left">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{rule.name}</span>
          <code className="text-xs bg-muted px-2 py-0.5 rounded ml-auto">{rule.pattern}</code>
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
            <Input value={rule.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="规则名称" />
          </div>
          <div className="grid gap-2">
            <Label>正则表达式</Label>
            <Input
              value={rule.pattern}
              onChange={(e) => onUpdate({ pattern: e.target.value })}
              placeholder="正则表达式模式"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">使用捕获组 () 来匹配并高亮内容。</p>
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
              placeholder="例如：background-color: yellow; color: black;"
              className="font-mono text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>保留分隔符</Label>
              <p className="text-xs text-muted-foreground">
                开启后显示包含分隔符的完整内容，否则仅显示内部文本。
              </p>
            </div>
            <Switch
              checked={rule.keepDelimiters}
              onCheckedChange={(checked) => onUpdate({ keepDelimiters: checked })}
            />
          </div>
          <div className="grid gap-2">
            <Label>预览</Label>
            <div className="p-3 rounded border bg-muted/50">
              <span
                className={rule.className}
                style={
                  rule.style
                    ? Object.fromEntries(
                        rule.style
                          .split(';')
                          .filter((s) => s.trim())
                          .map((s) => {
                            const [key, value] = s.split(':').map((x) => x.trim());
                            return [key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value];
                          })
                      )
                    : undefined
                }
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

function AddSpecialFieldRuleForm({ onAdd }: { onAdd: (rule: Omit<SpecialFieldRule, 'id'>) => void }) {
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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="规则名称" className="flex-1" />
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
      <p className="text-xs text-muted-foreground">示例：\\[([^\\]]+)\\] 匹配中括号内容。</p>
    </div>
  );
}

interface SpecialFieldsCardProps {
  specialFieldRules: SpecialFieldRule[];
  addSpecialFieldRule: (rule: Omit<SpecialFieldRule, 'id'>) => void;
  removeSpecialFieldRule: (id: string) => void;
  updateSpecialFieldRule: (id: string, updates: Partial<Omit<SpecialFieldRule, 'id'>>) => void;
}

export function SpecialFieldsCard({
  specialFieldRules,
  addSpecialFieldRule,
  removeSpecialFieldRule,
  updateSpecialFieldRule,
}: SpecialFieldsCardProps) {
  const [specialFieldsOpen, setSpecialFieldsOpen] = React.useState(true);
  const builtInRuleIds = ['double-quotes', 'parentheses', 'asterisk-action'];

  return (
    <Card>
      <Collapsible open={specialFieldsOpen} onOpenChange={setSpecialFieldsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setSpecialFieldsOpen(!specialFieldsOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2">
              {specialFieldsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Type className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle>特殊字段渲染</CardTitle>
                <CardDescription>通过正则规则高亮特定格式文本。</CardDescription>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
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

            <div className="pt-2">
              <Label className="text-sm mb-2 block">添加自定义规则</Label>
              <AddSpecialFieldRuleForm onAdd={addSpecialFieldRule} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
