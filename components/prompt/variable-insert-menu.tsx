'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Plus, Clock, MapPin, Monitor, User, MessageSquare, Hash, Shuffle, Variable } from 'lucide-react';

/**
 * 变量定义接口
 */
interface VariableDefinition {
  name: string;
  label: string;
  description: string;
  syntax: string;
  icon?: React.ReactNode;
  category: 'system' | 'placeholder' | 'macro';
}

/**
 * 系统变量列表
 */
const SYSTEM_VARIABLES: VariableDefinition[] = [
  {
    name: 'time',
    label: '当前时间',
    description: '实时获取当前时间',
    syntax: '{{time}}',
    icon: <Clock className="h-4 w-4" />,
    category: 'system',
  },
  {
    name: 'location',
    label: '当前位置',
    description: '获取当前地理位置',
    syntax: '{{location}}',
    icon: <MapPin className="h-4 w-4" />,
    category: 'system',
  },
  {
    name: 'device_info',
    label: '设备信息',
    description: '获取设备和浏览器信息',
    syntax: '{{device_info}}',
    icon: <Monitor className="h-4 w-4" />,
    category: 'system',
  },
];

/**
 * 占位符列表
 */
const PLACEHOLDERS: VariableDefinition[] = [
  {
    name: 'user',
    label: '用户名称',
    description: '当前用户的名称',
    syntax: '{{user}}',
    icon: <User className="h-4 w-4" />,
    category: 'placeholder',
  },
  {
    name: 'char',
    label: '角色名称',
    description: '当前角色的名称',
    syntax: '{{char}}',
    icon: <User className="h-4 w-4" />,
    category: 'placeholder',
  },
  {
    name: 'last_user_message',
    label: '最后用户消息',
    description: '最后一条用户发送的消息',
    syntax: '{{last_user_message}}',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'placeholder',
  },
  {
    name: 'chat_history',
    label: '对话历史',
    description: '对话窗口内所有上下文',
    syntax: '{{chat_history}}',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'placeholder',
  },
];

/**
 * 宏模板列表
 */
const MACROS: VariableDefinition[] = [
  {
    name: 'setvar',
    label: '设置变量',
    description: '设置一个临时变量',
    syntax: '{{setvar::变量名::变量值}}',
    icon: <Variable className="h-4 w-4" />,
    category: 'macro',
  },
  {
    name: 'getvar',
    label: '获取变量',
    description: '获取已设置的变量值',
    syntax: '{{getvar::变量名}}',
    icon: <Hash className="h-4 w-4" />,
    category: 'macro',
  },
  {
    name: 'random',
    label: '随机选择',
    description: '从选项中随机选择一个',
    syntax: '{{random::选项1::选项2::选项3}}',
    icon: <Shuffle className="h-4 w-4" />,
    category: 'macro',
  },
];

/**
 * 变量插入菜单组件 Props
 */
interface VariableInsertMenuProps {
  onInsert: (syntax: string) => void;
  triggerText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 变量插入菜单组件
 * 提供变量、占位符和宏的快速插入功能
 */
export function VariableInsertMenu({
  onInsert,
  triggerText = '插入变量',
  disabled = false,
  className,
}: VariableInsertMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={className}
        >
          <Plus className="h-4 w-4 mr-1" />
          {triggerText}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        {/* 系统变量 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Monitor className="h-4 w-4 mr-2" />
            系统变量
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuLabel>系统变量（实时获取）</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SYSTEM_VARIABLES.map((variable) => (
              <DropdownMenuItem
                key={variable.name}
                onClick={() => onInsert(variable.syntax)}
              >
                <div className="flex items-start gap-2 w-full">
                  {variable.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{variable.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {variable.syntax}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* 占位符 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <User className="h-4 w-4 mr-2" />
            占位符
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuLabel>占位符（上下文相关）</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PLACEHOLDERS.map((placeholder) => (
              <DropdownMenuItem
                key={placeholder.name}
                onClick={() => onInsert(placeholder.syntax)}
              >
                <div className="flex items-start gap-2 w-full">
                  {placeholder.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{placeholder.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {placeholder.syntax}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* 宏 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Variable className="h-4 w-4 mr-2" />
            宏
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            <DropdownMenuLabel>宏（动态处理）</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MACROS.map((macro) => (
              <DropdownMenuItem
                key={macro.name}
                onClick={() => onInsert(macro.syntax)}
              >
                <div className="flex items-start gap-2 w-full">
                  {macro.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{macro.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {macro.description}
                    </div>
                    <code className="text-xs bg-muted px-1 rounded mt-1 inline-block">
                      {macro.syntax}
                    </code>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* 常用变量快捷方式 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>常用</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onInsert('{{user}}')}>
            <User className="h-4 w-4 mr-2" />
            用户名 <code className="ml-auto text-xs text-muted-foreground">{'{{user}}'}</code>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert('{{char}}')}>
            <User className="h-4 w-4 mr-2" />
            角色名 <code className="ml-auto text-xs text-muted-foreground">{'{{char}}'}</code>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert('{{time}}')}>
            <Clock className="h-4 w-4 mr-2" />
            时间 <code className="ml-auto text-xs text-muted-foreground">{'{{time}}'}</code>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 获取所有可用变量列表
 */
export function getAllVariables(): VariableDefinition[] {
  return [...SYSTEM_VARIABLES, ...PLACEHOLDERS, ...MACROS];
}

/**
 * 根据分类获取变量列表
 */
export function getVariablesByCategory(category: VariableDefinition['category']): VariableDefinition[] {
  return getAllVariables().filter((v) => v.category === category);
}

export type { VariableDefinition };