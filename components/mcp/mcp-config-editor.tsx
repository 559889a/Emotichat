'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Braces, AlertCircle, CheckCircle2, Copy, RotateCcw, Info } from 'lucide-react';
import type { McpServerConfig } from '@/types/advanced';
import { cn } from '@/lib/utils';

interface McpConfigEditorProps {
  servers: McpServerConfig[];
  onChange: (servers: McpServerConfig[]) => void;
  globalEnabled: boolean;
  onGlobalEnabledChange: (enabled: boolean) => void;
}

/** MCP 配置的 JSON 格式（IDE 风格） */
interface McpJsonConfig {
  mcpServers: Record<string, {
    command?: string;
    args?: string[];
    endpoint?: string;
    env?: Record<string, string>;
    autoApprove?: boolean;
  }>;
}

/** 内部服务器格式转换为 JSON 配置格式 */
function serversToJson(servers: McpServerConfig[]): McpJsonConfig {
  const mcpServers: McpJsonConfig['mcpServers'] = {};

  for (const server of servers) {
    const config: McpJsonConfig['mcpServers'][string] = {};

    if (server.command) {
      config.command = server.command;
    }
    if (server.args && server.args.length > 0) {
      config.args = server.args;
    }
    if (server.endpoint) {
      config.endpoint = server.endpoint;
    }
    if (server.env && Object.keys(server.env).length > 0) {
      config.env = server.env;
    }
    if (server.autoApprove !== undefined) {
      config.autoApprove = server.autoApprove;
    }

    mcpServers[server.name] = config;
  }

  return { mcpServers };
}

/** JSON 配置格式转换为内部服务器格式 */
function jsonToServers(json: McpJsonConfig, existingServers: McpServerConfig[]): McpServerConfig[] {
  const servers: McpServerConfig[] = [];
  const existingMap = new Map(existingServers.map(s => [s.name, s]));

  for (const [name, config] of Object.entries(json.mcpServers)) {
    const existing = existingMap.get(name);
    servers.push({
      id: existing?.id || crypto.randomUUID(),
      name,
      command: config.command,
      args: config.args,
      endpoint: config.endpoint,
      env: config.env,
      enabled: existing?.enabled ?? true,
      autoApprove: config.autoApprove ?? false,
      capabilities: existing?.capabilities,
    });
  }

  return servers;
}

/** 验证 JSON 格式 */
function validateJson(text: string): { valid: boolean; error?: string; data?: McpJsonConfig } {
  try {
    const parsed = JSON.parse(text);

    if (typeof parsed !== 'object' || parsed === null) {
      return { valid: false, error: '配置必须是一个对象' };
    }

    if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
      return { valid: false, error: '缺少 mcpServers 字段或格式错误' };
    }

    for (const [name, config] of Object.entries(parsed.mcpServers)) {
      if (typeof config !== 'object' || config === null) {
        return { valid: false, error: `服务器 "${name}" 的配置必须是对象` };
      }

      const serverConfig = config as Record<string, unknown>;

      if (!serverConfig.command && !serverConfig.endpoint) {
        return { valid: false, error: `服务器 "${name}" 必须指定 command 或 endpoint` };
      }

      if (serverConfig.command && typeof serverConfig.command !== 'string') {
        return { valid: false, error: `服务器 "${name}" 的 command 必须是字符串` };
      }

      if (serverConfig.args && !Array.isArray(serverConfig.args)) {
        return { valid: false, error: `服务器 "${name}" 的 args 必须是数组` };
      }

      if (serverConfig.endpoint && typeof serverConfig.endpoint !== 'string') {
        return { valid: false, error: `服务器 "${name}" 的 endpoint 必须是字符串` };
      }

      if (serverConfig.env && (typeof serverConfig.env !== 'object' || serverConfig.env === null)) {
        return { valid: false, error: `服务器 "${name}" 的 env 必须是对象` };
      }

      if (serverConfig.autoApprove !== undefined && typeof serverConfig.autoApprove !== 'boolean') {
        return { valid: false, error: `服务器 "${name}" 的 autoApprove 必须是布尔值` };
      }
    }

    return { valid: true, data: parsed as McpJsonConfig };
  } catch (e) {
    return { valid: false, error: `JSON 语法错误: ${(e as Error).message}` };
  }
}

/** 示例配置 */
const EXAMPLE_CONFIG: McpJsonConfig = {
  mcpServers: {
    'filesystem': {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-filesystem', '/path/to/allowed/files'],
      autoApprove: false,
    },
    'web-search': {
      endpoint: 'https://mcp.example.com/search',
      env: {
        'API_KEY': 'your-api-key-here',
      },
      autoApprove: true,
    },
  },
};

export function McpConfigEditor({
  servers,
  onChange,
  globalEnabled,
  onGlobalEnabledChange,
}: McpConfigEditorProps) {
  const initialJson = useMemo(() => {
    const config = serversToJson(servers);
    return JSON.stringify(config, null, 2);
  }, []);

  const [jsonText, setJsonText] = useState(initialJson);
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const currentJson = useMemo(() => {
    return JSON.stringify(serversToJson(servers), null, 2);
  }, [servers]);

  const handleJsonChange = useCallback((text: string) => {
    setJsonText(text);
    setHasChanges(text !== currentJson);
    const result = validateJson(text);
    setValidation(result);
  }, [currentJson]);

  const handleApply = useCallback(() => {
    const result = validateJson(jsonText);
    if (result.valid && result.data) {
      const newServers = jsonToServers(result.data, servers);
      onChange(newServers);
      setHasChanges(false);
    }
  }, [jsonText, servers, onChange]);

  const handleReset = useCallback(() => {
    setJsonText(currentJson);
    setValidation({ valid: true });
    setHasChanges(false);
    setShowResetDialog(false);
  }, [currentJson]);

  const handleLoadExample = useCallback(() => {
    const exampleText = JSON.stringify(EXAMPLE_CONFIG, null, 2);
    setJsonText(exampleText);
    setValidation({ valid: true });
    setHasChanges(true);
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(jsonText);
  }, [jsonText]);

  const handleToggleServer = useCallback((serverName: string, enabled: boolean) => {
    const newServers = servers.map(s =>
      s.name === serverName ? { ...s, enabled } : s
    );
    onChange(newServers);
  }, [servers, onChange]);

  const handleToggleAutoApprove = useCallback((serverName: string, autoApprove: boolean) => {
    const newServers = servers.map(s =>
      s.name === serverName ? { ...s, autoApprove } : s
    );
    onChange(newServers);
  }, [servers, onChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Braces className="h-5 w-5 text-primary" />
          MCP 集成
        </CardTitle>
        <CardDescription>
          使用 JSON 格式配置 MCP 服务器，支持 stdio 和 HTTP 两种模式
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 全局开关 */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-medium">启用 MCP</p>
            <p className="text-xs text-muted-foreground">关闭后不会发起任何 MCP 调用</p>
          </div>
          <Switch
            checked={globalEnabled}
            onCheckedChange={onGlobalEnabledChange}
          />
        </div>

        <Separator />

        {/* JSON 编辑器 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">服务器配置</span>
              {validation.valid ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  有效
                </Badge>
              ) : (
                <Badge variant="outline" className="text-destructive border-destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  无效
                </Badge>
              )}
              {hasChanges && (
                <Badge variant="secondary">未保存的更改</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLoadExample}
                title="加载示例配置"
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                title="复制配置"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                disabled={!hasChanges}
                title="重置更改"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* JSON 文本编辑区 */}
          <div className="relative">
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className={cn(
                'w-full h-80 p-4 font-mono text-sm rounded-md border bg-muted/30',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'resize-none',
                !validation.valid && 'border-destructive focus:ring-destructive'
              )}
              spellCheck={false}
              placeholder={JSON.stringify(EXAMPLE_CONFIG, null, 2)}
            />
          </div>

          {/* 错误提示 */}
          {!validation.valid && validation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validation.error}</AlertDescription>
            </Alert>
          )}

          {/* 应用按钮 */}
          <Button
            onClick={handleApply}
            disabled={!validation.valid || !hasChanges}
            className="w-full"
          >
            应用配置
          </Button>
        </div>

        <Separator />

        {/* 服务器权限控制列表 */}
        {servers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">服务器权限控制</span>
              <span className="text-xs text-muted-foreground">
                管理各服务器的启用状态和 AI 自动调用权限
              </span>
            </div>

            <div className="space-y-2">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-md border',
                    server.enabled ? 'bg-background' : 'bg-muted/50 opacity-60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={server.enabled}
                      onCheckedChange={(checked) => handleToggleServer(server.name, checked)}
                    />
                    <div>
                      <p className="font-medium text-sm">{server.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {server.command ? `命令: ${server.command}` : `端点: ${server.endpoint}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">自动批准</span>
                    <Switch
                      checked={server.autoApprove ?? false}
                      onCheckedChange={(checked) => handleToggleAutoApprove(server.name, checked)}
                      disabled={!server.enabled}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>自动批准：</strong>开启后，AI 可自动调用该 MCP 服务器而无需用户确认。
              建议仅对受信任的服务器开启此选项。
            </p>
          </div>
        )}

        {/* 重置确认对话框 */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认重置</AlertDialogTitle>
              <AlertDialogDescription>
                这将丢弃所有未应用的更改，恢复到上次保存的配置。确定继续吗？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>确认重置</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
