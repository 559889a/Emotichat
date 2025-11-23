'use client';

/**
 * 自定义端点管理对话框
 * 支持添加 OpenAI/Gemini/Claude 兼容的自定义端点
 */

import * as React from 'react';
import { Plus, Trash2, Edit, Check, X, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getCustomProviders,
  addCustomProvider,
  updateCustomProvider,
  deleteCustomProvider,
  testCustomProviderConnection,
  validateUrl,
  type CustomProvider,
  type ProtocolType,
} from '@/lib/ai/models';

interface CustomProviderFormData {
  name: string;
  protocol: ProtocolType;
  baseUrl: string;
  apiKey: string;
  models: string;
}

const DEFAULT_FORM_DATA: CustomProviderFormData = {
  name: '',
  protocol: 'openai',
  baseUrl: '',
  apiKey: '',
  models: '',
};

export function CustomProviderDialog() {
  const [open, setOpen] = React.useState(false);
  const [providers, setProviders] = React.useState<CustomProvider[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<CustomProviderFormData>(DEFAULT_FORM_DATA);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [urlValidation, setUrlValidation] = React.useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  // 加载自定义端点列表
  const loadProviders = React.useCallback(() => {
    setProviders(getCustomProviders());
  }, []);

  React.useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // 重置表单
  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingId(null);
    setTestResult(null);
    setUrlValidation(null);
  };

  // 打开编辑模式
  const handleEdit = (provider: CustomProvider) => {
    setFormData({
      name: provider.name,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      models: provider.models.join(', '),
    });
    setEditingId(provider.id);
    setTestResult(null);
    setUrlValidation(null);
  };

  // 删除端点
  const handleDelete = (id: string) => {
    if (confirm('确定要删除此自定义端点吗？')) {
      deleteCustomProvider(id);
      loadProviders();
    }
  };

  // 验证 URL
  const handleUrlChange = (url: string) => {
    setFormData((prev) => ({ ...prev, baseUrl: url }));
    
    if (url) {
      const validation = validateUrl(url);
      setUrlValidation(validation);
    } else {
      setUrlValidation(null);
    }
  };

  // 测试连接
  const handleTest = async () => {
    if (!formData.baseUrl || !formData.apiKey) {
      setTestResult({
        success: false,
        message: '请填写 Base URL 和 API Key',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testCustomProviderConnection(
        formData.baseUrl,
        formData.apiKey,
        formData.protocol
      );
      setTestResult({
        success: result.success,
        message: result.message || result.error || '未知错误',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 保存端点
  const handleSave = () => {
    // 验证表单
    if (!formData.name || !formData.baseUrl || !formData.apiKey) {
      setTestResult({
        success: false,
        message: '请填写所有必填字段',
      });
      return;
    }

    // 验证 URL
    const urlCheck = validateUrl(formData.baseUrl);
    if (!urlCheck.valid) {
      setTestResult({
        success: false,
        message: urlCheck.error || 'URL 无效',
      });
      return;
    }

    // 解析模型列表
    const models = formData.models
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    if (models.length === 0) {
      setTestResult({
        success: false,
        message: '请至少添加一个模型',
      });
      return;
    }

    try {
      if (editingId) {
        // 更新现有端点
        updateCustomProvider(editingId, {
          name: formData.name,
          protocol: formData.protocol,
          baseUrl: formData.baseUrl,
          apiKey: formData.apiKey,
          models,
        });
      } else {
        // 添加新端点
        addCustomProvider({
          name: formData.name,
          protocol: formData.protocol,
          baseUrl: formData.baseUrl,
          apiKey: formData.apiKey,
          models,
          enabled: true,
        });
      }

      loadProviders();
      resetForm();
      setOpen(false);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '保存失败',
      });
    }
  };

  // 协议说明
  const protocolDescriptions: Record<ProtocolType, string> = {
    openai: 'OpenAI 兼容 API（如 LocalAI、Ollama、vLLM 等）',
    gemini: 'Google Gemini API 格式',
    anthropic: 'Anthropic Claude API 格式（X-AI 协议）',
  };

  return (
    <div className="space-y-4">
      {/* 添加按钮 */}
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            添加自定义端点
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? '编辑自定义端点' : '添加自定义端点'}
            </DialogTitle>
            <DialogDescription>
              配置 OpenAI/Gemini/Claude 兼容的自定义 API 端点
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 端点名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">端点名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：本地 LLaMA"
              />
            </div>

            {/* 协议类型 */}
            <div className="space-y-2">
              <Label htmlFor="protocol">协议类型 *</Label>
              <Select
                value={formData.protocol}
                onValueChange={(value: ProtocolType) =>
                  setFormData({ ...formData, protocol: value })
                }
              >
                <SelectTrigger id="protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI 兼容</SelectItem>
                  <SelectItem value="gemini">Gemini 兼容</SelectItem>
                  <SelectItem value="anthropic">Claude (X-AI) 兼容</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {protocolDescriptions[formData.protocol]}
              </p>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL *</Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://api.example.com"
              />
              {urlValidation && !urlValidation.valid && (
                <p className="text-xs text-destructive">{urlValidation.error}</p>
              )}
              {urlValidation && urlValidation.valid && urlValidation.error && (
                <p className="text-xs text-yellow-600">{urlValidation.error}</p>
              )}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="输入 API Key"
              />
            </div>

            {/* 模型列表 */}
            <div className="space-y-2">
              <Label htmlFor="models">可用模型 *</Label>
              <Input
                id="models"
                value={formData.models}
                onChange={(e) => setFormData({ ...formData, models: e.target.value })}
                placeholder="模型ID，用逗号分隔（例如：llama-3-70b, gpt-3.5-turbo）"
              />
              <p className="text-xs text-muted-foreground">
                输入该端点支持的模型 ID，用逗号分隔
              </p>
            </div>

            {/* 测试连接按钮 */}
            <Button
              onClick={handleTest}
              disabled={isTesting || !formData.baseUrl || !formData.apiKey}
              variant="outline"
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </Button>

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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingId ? '更新' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 现有端点列表 */}
      {providers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">已配置的自定义端点</h3>
          <div className="grid gap-2">
            {providers.map((provider) => (
              <Card key={provider.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {provider.baseUrl}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleEdit(provider);
                          setOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(provider.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {provider.protocol === 'openai' && 'OpenAI'}
                      {provider.protocol === 'gemini' && 'Gemini'}
                      {provider.protocol === 'anthropic' && 'Claude'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {provider.models.length} 个模型
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      {providers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            暂无自定义端点。点击上方按钮添加 OpenAI、Gemini 或 Claude 兼容的自定义 API 端点。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}