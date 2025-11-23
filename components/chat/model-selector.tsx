'use client';

/**
 * 改进的模型选择器组件
 * 功能：
 * - 拉取按钮：动态拉取官方/自定义端点的模型列表
 * - 可折叠列表：Provider 分组可折叠
 * - 当前模型显示：清晰显示当前选中的模型
 * - 手动输入：支持直接输入模型 ID
 */

import * as React from 'react';
import { Check, ChevronDown, ChevronRight, Info, Search, Sparkles, RefreshCw, Pencil, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  getAllProviders,
  parseModelValue,
  formatModelDisplayName,
  type ModelProvider,
  type ModelInfo,
} from '@/lib/ai/models';
import { fetchOfficialModels } from '@/lib/ai/models/providers';

interface ModelSelectorProps {
  value?: string; // providerId:modelId 格式
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onValueChange,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [manualInput, setManualInput] = React.useState('');
  const [showManualInput, setShowManualInput] = React.useState(false);
  const [collapsedProviders, setCollapsedProviders] = React.useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = React.useState(false);
  const [providers, setProviders] = React.useState<ModelProvider[]>(() => getAllProviders());

  // 解析当前选中的模型
  const selectedModel = React.useMemo(() => {
    if (!value) return null;
    
    const parsed = parseModelValue(value);
    if (!parsed) return null;
    
    const provider = providers.find(p => p.id === parsed.providerId);
    if (!provider) return null;
    
    const model = provider.models.find(m => m.id === parsed.modelId);
    
    return {
      provider,
      model,
      displayName: formatModelDisplayName(parsed.providerId, parsed.modelId),
      parsed,
    };
  }, [value, providers]);

  // 切换 Provider 折叠状态
  const toggleProvider = (providerId: string) => {
    setCollapsedProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  // 拉取官方模型
  const handleFetchModels = async (providerId: 'openai' | 'google' | 'anthropic') => {
    setIsFetching(true);
    try {
      const models = await fetchOfficialModels(providerId);
      if (models.length > 0) {
        // 更新 providers 列表
        setProviders(prev => 
          prev.map(p => 
            p.id === providerId 
              ? { ...p, models }
              : p
          )
        );
      }
    } catch (error) {
      console.error(`Failed to fetch ${providerId} models:`, error);
    } finally {
      setIsFetching(false);
    }
  };

  // 过滤模型
  const filteredProviders = React.useMemo(() => {
    if (!searchQuery) return providers;
    
    const query = searchQuery.toLowerCase();
    return providers.map(provider => ({
      ...provider,
      models: provider.models.filter(
        model =>
          model.name.toLowerCase().includes(query) ||
          model.id.toLowerCase().includes(query) ||
          provider.name.toLowerCase().includes(query)
      ),
    })).filter(provider => provider.models.length > 0);
  }, [providers, searchQuery]);

  // 处理模型选择
  const handleSelect = (providerId: string, modelId: string) => {
    const newValue = `${providerId}:${modelId}`;
    onValueChange?.(newValue);
    setOpen(false);
    setShowManualInput(false);
    setManualInput('');
  };

  // 处理手动输入
  const handleManualInputSubmit = () => {
    if (!manualInput.trim()) return;
    
    // 如果包含冒号，直接使用
    if (manualInput.includes(':')) {
      onValueChange?.(manualInput.trim());
    } else {
      // 否则假设是当前 provider 的模型
      const currentProviderId = selectedModel?.parsed.providerId || 'openai';
      onValueChange?.(` ${currentProviderId}:${manualInput.trim()}`);
    }
    
    setOpen(false);
    setShowManualInput(false);
    setManualInput('');
  };

  // 格式化上下文窗口显示
  const formatContextWindow = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  // 渲染模型项
  const renderModelItem = (provider: ModelProvider, model: ModelInfo) => {
    const modelValue = `${provider.id}:${model.id}`;
    const isSelected = value === modelValue;

    return (
      <CommandItem
        key={modelValue}
        value={modelValue}
        onSelect={() => handleSelect(provider.id, model.id)}
        className="flex items-center justify-between gap-2 px-2 py-2 cursor-pointer"
      >
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{model.name}</span>
            {model.deprecated && (
              <Badge variant="outline" className="text-xs">
                已弃用
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatContextWindow(model.contextWindow)} tokens</span>
            
            {model.supportsVision && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                视觉
              </Badge>
            )}
            
            {model.supportsTools && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                工具
              </Badge>
            )}
            
            {model.pricing && (
              <span className="text-xs">
                ${model.pricing.input}/{model.pricing.output}
              </span>
            )}
          </div>
        </div>
        
        <Check
          className={cn(
            'h-4 w-4 flex-shrink-0',
            isSelected ? 'opacity-100' : 'opacity-0'
          )}
        />
      </CommandItem>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            !selectedModel && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            {selectedModel ? (
              <div className="flex flex-col items-start truncate">
                <span className="truncate text-sm">{selectedModel.displayName}</span>
                {selectedModel.model && (
                  <span className="text-xs text-muted-foreground">
                    {formatContextWindow(selectedModel.model.contextWindow)} tokens
                  </span>
                )}
              </div>
            ) : (
              <span>选择模型</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[450px] p-0" align="start">
        <Command>
          {/* 搜索框 */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="搜索模型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          {/* 手动输入模式 */}
          {showManualInput && (
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="输入模型 ID (例如: gpt-4o 或 openai:gpt-4o)"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualInputSubmit();
                    } else if (e.key === 'Escape') {
                      setShowManualInput(false);
                      setManualInput('');
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleManualInputSubmit}>
                  确定
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setShowManualInput(false);
                    setManualInput('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                提示：直接输入模型 ID，或使用 providerId:modelId 格式
              </p>
            </div>
          )}
          
          <CommandList className="max-h-[400px]">
            {!showManualInput && (
              <div className="px-2 py-2 border-b bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowManualInput(true)}
                >
                  <Pencil className="h-4 w-4" />
                  手动输入模型 ID
                </Button>
              </div>
            )}
            
            <CommandEmpty>未找到匹配的模型</CommandEmpty>
            
            {filteredProviders.map((provider, index) => {
              const isCollapsed = collapsedProviders.has(provider.id);
              const canFetch = ['openai', 'google', 'anthropic'].includes(provider.id);
              
              return (
                <React.Fragment key={provider.id}>
                  {index > 0 && <CommandSeparator />}
                  
                  <CommandGroup
                    heading={
                      <div 
                        className="flex items-center justify-between cursor-pointer group"
                        onClick={() => toggleProvider(provider.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>{provider.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({provider.models.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {canFetch && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFetchModels(provider.id as 'openai' | 'google' | 'anthropic');
                              }}
                              disabled={isFetching}
                            >
                              <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
                            </Button>
                          )}
                          {provider.isCustom && (
                            <Badge variant="outline" className="text-xs">
                              自定义
                            </Badge>
                          )}
                        </div>
                      </div>
                    }
                  >
                    {!isCollapsed && provider.models.map((model) =>
                      renderModelItem(provider, model)
                    )}
                  </CommandGroup>
                </React.Fragment>
              );
            })}
          </CommandList>
        </Command>
        
        {selectedModel?.model?.description && (
          <div className="border-t p-3 text-xs text-muted-foreground bg-muted/30">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{selectedModel.model.description}</p>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * 简化版模型选择器（仅显示模型名称，不显示详细信息）
 */
interface SimpleModelSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function SimpleModelSelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = '选择模型',
  className,
}: SimpleModelSelectorProps) {
  const providers = React.useMemo(() => getAllProviders(), []);
  
  const selectedModel = React.useMemo(() => {
    if (!value) return null;
    const parsed = parseModelValue(value);
    if (!parsed) return null;
    return formatModelDisplayName(parsed.providerId, parsed.modelId);
  }, [value]);

  return (
    <select
      value={value || ''}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <option value="">{placeholder}</option>
      {providers.map((provider) => (
        <optgroup key={provider.id} label={provider.name}>
          {provider.models.map((model) => (
            <option key={model.id} value={`${provider.id}:${model.id}`}>
              {model.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}