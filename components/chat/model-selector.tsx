'use client';

/**
 * 模型选择器组件
 * 支持选择官方模型和自定义端点
 */

import * as React from 'react';
import { Check, ChevronDown, Info, Search, Sparkles } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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
import { cn } from '@/lib/utils';
import {
  getAllProviders,
  parseModelValue,
  formatModelDisplayName,
  type ModelProvider,
  type ModelInfo,
} from '@/lib/ai/models';

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
  const providers = React.useMemo(() => getAllProviders(), []);

  // 解析当前选中的模型
  const selectedModel = React.useMemo(() => {
    if (!value) return null;
    
    const parsed = parseModelValue(value);
    if (!parsed) return null;
    
    const provider = providers.find(p => p.id === parsed.providerId);
    if (!provider) return null;
    
    const model = provider.models.find(m => m.id === parsed.modelId);
    if (!model) return null;
    
    return {
      provider,
      model,
      displayName: formatModelDisplayName(parsed.providerId, parsed.modelId),
    };
  }, [value, providers]);

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
        className="flex items-center justify-between gap-2 px-2 py-2"
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
              <span className="truncate">{selectedModel.displayName}</span>
            ) : (
              <span>选择模型</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="搜索模型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <CommandList className="max-h-[400px]">
            <CommandEmpty>未找到匹配的模型</CommandEmpty>
            
            {filteredProviders.map((provider, index) => (
              <React.Fragment key={provider.id}>
                {index > 0 && <CommandSeparator />}
                
                <CommandGroup
                  heading={
                    <div className="flex items-center justify-between">
                      <span>{provider.name}</span>
                      {provider.isCustom && (
                        <Badge variant="outline" className="text-xs">
                          自定义
                        </Badge>
                      )}
                    </div>
                  }
                >
                  {provider.models.map((model) =>
                    renderModelItem(provider, model)
                  )}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
        
        {selectedModel?.model.description && (
          <div className="border-t p-3 text-xs text-muted-foreground">
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