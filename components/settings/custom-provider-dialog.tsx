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
  fetchModelsFromCustomProvider,
  validateUrl,
  type CustomProvider,
  type ProtocolType,
} from '@/lib/ai/models';
import { getGlobalModelConfig, setGlobalModelConfig, type GlobalModelConfig } from './global-endpoint-selector';

interface CustomProviderFormData {
  name: string;
  protocol: ProtocolType;
  baseUrl: string;
  apiKey: string;
  models: string;
  selectedModel: string;
}

const DEFAULT_FORM_DATA: CustomProviderFormData = {
  name: '',
  protocol: 'openai',
  baseUrl: '',
  apiKey: '',
  models: '',
  selectedModel: '',
};

export function CustomProviderDialog() {
  const [open, setOpen] = React.useState(false);
  const [providers, setProviders] = React.useState<CustomProvider[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<CustomProviderFormData>(DEFAULT_FORM_DATA);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isFetchingModels, setIsFetchingModels] = React.useState(false);
  const [fetchedModels, setFetchedModels] = React.useState<string[]>([]);
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
    setFetchedModels([]);
  };

  // 打开编辑模式
  const handleEdit = (provider: CustomProvider) => {
    const modelId = provider.models[0] || ''; // 取第一个模型
    setFormData({
      name: provider.name,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      models: modelId,
      selectedModel: modelId,
    });
    setEditingId(provider.id);
    setTestResult(null);
    setUrlValidation(null);
  };

  // 删除端点
  const handleDelete = (id: string) => {
    if (confirm('确定要删除此自定义端点吗？')) {
      // 检查是否是当前选中的全局端点
      const globalConfig = getGlobalModelConfig();
      if (globalConfig && globalConfig.isCustom && globalConfig.customProviderId === id) {
        // 清除全局配置，因为端点被删除了
        localStorage.removeItem('globalModelConfig');
        console.log('Cleared global config because custom provider was deleted');
      }

      deleteCustomProvider(id);
      loadProviders();

      // 触发自定义端点变化事件和全局配置变化事件
      window.dispatchEvent(new Event('customProvidersChanged'));
      window.dispatchEvent(new Event('globalConfigChanged'));
    }
  };

  // 规范化 BaseURL（只移除末尾斜杠，保留所有路径）
  const normalizeBaseUrl = (url: string): string => {
    if (!url) return url;

    // 只移除末尾的斜杠，保留所有其他路径
    url = url.replace(/\/+$/, '');

    return url;
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

  // 测试连接（合并拉取模型功能）
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
      // 规范化 URL
      const normalizedUrl = normalizeBaseUrl(formData.baseUrl);

      // 测试连接
      const testResult = await testCustomProviderConnection(
        normalizedUrl,
        formData.apiKey,
        formData.protocol
      );

      if (!testResult.success) {
        setTestResult({
          success: false,
          message: testResult.error || '连接测试失败',
        });
        setIsTesting(false);
        return;
      }

      // 测试成功后自动拉取模型列表
      setIsFetchingModels(true);
      const modelsResult = await fetchModelsFromCustomProvider(
        normalizedUrl,
        formData.apiKey,
        formData.protocol
      );

      if (modelsResult.success && modelsResult.models) {
        setFetchedModels(modelsResult.models);
        setFormData((prev) => ({
          ...prev,
          baseUrl: normalizedUrl, // 更新为规范化后的 URL
        }));
        setTestResult({
          success: true,
          message: `连接成功！拉取到 ${modelsResult.models.length} 个模型`,
        });

        // 3秒后自动隐藏提示
        setTimeout(() => {
          setTestResult(null);
        }, 3000);
      } else {
        setFormData((prev) => ({
          ...prev,
          baseUrl: normalizedUrl,
        }));
        setTestResult({
          success: true,
          message: '连接成功，但无法拉取模型列表（可能不支持）',
        });

        // 3秒后自动隐藏提示
        setTimeout(() => {
          setTestResult(null);
        }, 3000);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setIsTesting(false);
      setIsFetchingModels(false);
    }
  };

  // 从拉取的模型列表中选择模型
  const handleSelectModel = (model: string) => {
    setFormData((prev) => ({
      ...prev,
      models: model,
      selectedModel: model,
    }));
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

    // 验证模型ID
    const modelId = formData.models.trim();
    if (!modelId) {
      setTestResult({
        success: false,
        message: '请填写模型 ID',
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
          models: [modelId], // 转换为数组格式
        });

        // 检查是否是当前选中的全局端点
        const globalConfig = getGlobalModelConfig();
        if (globalConfig && globalConfig.isCustom && globalConfig.customProviderId === editingId) {
          // 更新全局配置中的自定义端点信息
          const providerType = formData.protocol === 'openai' ? 'openai' :
                               formData.protocol === 'gemini' ? 'google' : 'anthropic';

          const updatedGlobalConfig: GlobalModelConfig = {
            ...globalConfig,
            providerId: providerType,
            modelId,
            providerType,
            customEndpoint: {
              apiKey: formData.apiKey,
              baseUrl: formData.baseUrl,
              protocol: formData.protocol,
            },
          };

          setGlobalModelConfig(updatedGlobalConfig);
          console.log('Updated global config for edited custom provider:', updatedGlobalConfig);
        }
      } else {
        // 添加新端点
        addCustomProvider({
          name: formData.name,
          protocol: formData.protocol,
          baseUrl: formData.baseUrl,
          apiKey: formData.apiKey,
          models: [modelId], // 转换为数组格式
          enabled: true,
        });
      }

      loadProviders();
      resetForm();
      setOpen(false);

      // 触发自定义端点变化事件
      window.dispatchEvent(new Event('customProvidersChanged'));
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '保存失败',
      });
    }
  };

  // 协议说明
  const protocolDescriptions: Record<ProtocolType, string> = {
    openai: 'OpenAI 兼容 API（LocalAI、Ollama、vLLM 等）→ 请求路径：您的URL + /v1/chat/completions',
    gemini: 'Google Gemini API 格式 → 请求路径：您的URL + /v1beta',
    anthropic: 'Anthropic Claude API 格式（X-AI）→ 请求路径：您的URL + /v1/messages',
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
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">⚡ 系统会在您填写的 URL 后自动添加协议路径：</p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>OpenAI: <code className="bg-muted px-1 rounded">您的URL + /v1/chat/completions</code></li>
                  <li>Gemini: <code className="bg-muted px-1 rounded">您的URL + /v1beta</code></li>
                  <li>Claude: <code className="bg-muted px-1 rounded">您的URL + /v1/messages</code></li>
                </ul>
                <p className="pt-1">
                  <span className="font-medium">示例：</span>填写 <code className="bg-muted px-1 rounded">https://api.example.com/custom/path</code>
                  <br />
                  <span className="ml-8">→ 实际请求：<code className="bg-muted px-1 rounded">https://api.example.com/custom/path/v1/chat/completions</code></span>
                </p>
              </div>
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
                  {isFetchingModels ? '正在拉取模型...' : '测试中...'}
                </>
              ) : (
                '测试连接并拉取模型'
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

            {/* 选择模型 */}
            <div className="space-y-2">
              <Label htmlFor="selectedModel">选择模型</Label>
              {fetchedModels.length > 0 ? (
                <Select
                  value={formData.selectedModel}
                  onValueChange={(value) => {
                    if (value === '__custom__') {
                      setFormData((prev) => ({ ...prev, selectedModel: '', models: '' }));
                    } else {
                      handleSelectModel(value);
                    }
                  }}
                >
                  <SelectTrigger id="selectedModel">
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
                <Input
                  id="selectedModel"
                  value={formData.selectedModel}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, selectedModel: value, models: value });
                  }}
                  placeholder="输入模型名称"
                />
              )}
            </div>

            {/* 模型ID */}
            <div className="space-y-2">
              <Label htmlFor="models">模型 ID *（支持用户填入自定义模型ID）</Label>
              <Input
                id="models"
                value={formData.models}
                onChange={(e) => setFormData({ ...formData, models: e.target.value })}
                placeholder="例如：llama-3-70b"
              />
            </div>
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
                    <span className="text-xs text-muted-foreground font-mono">
                      模型: {provider.models[0] || '未设置'}
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