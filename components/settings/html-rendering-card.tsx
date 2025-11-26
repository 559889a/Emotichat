'use client';

import { Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface HtmlRenderingCardProps {
  enableHtmlRendering: boolean;
  setEnableHtmlRendering: (value: boolean) => void;
}

export function HtmlRenderingCard({
  enableHtmlRendering,
  setEnableHtmlRendering,
}: HtmlRenderingCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-green-500" />
          <div>
            <CardTitle>HTML/CSS 渲染</CardTitle>
            <CardDescription>允许在消息中使用 HTML 标签和内联样式。</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>启用 HTML 渲染</Label>
            <p className="text-sm text-muted-foreground">允许在消息中使用 HTML 标签和内联样式。</p>
          </div>
          <Switch checked={enableHtmlRendering} onCheckedChange={setEnableHtmlRendering} />
        </div>
        {enableHtmlRendering && (
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-3">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>注意：</strong>启用 HTML 渲染可能带来安全风险，仅在可信环境下使用。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
