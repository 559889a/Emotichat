'use client';

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Components } from 'react-markdown';
import { ChevronRight, ChevronDown, Brain } from 'lucide-react';
import { useUIPreferences, ThinkingTagConfig, SpecialFieldRule } from '@/stores/uiPreferences';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  thinkingTagPrepend?: string; // 从消息持久化数据传入，需要前置的开头标签
}

// 思维链折叠块组件
interface ThinkingBlockProps {
  content: string;
  defaultCollapsed: boolean;
}

function ThinkingBlock({ content, defaultCollapsed }: ThinkingBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="my-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        <Brain className="h-4 w-4" />
        <span>思维过程</span>
        {isCollapsed && (
          <span className="text-xs text-purple-500 dark:text-purple-400 ml-2">
            点击展开
          </span>
        )}
      </button>
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-purple-200 dark:border-purple-800 text-sm text-purple-900 dark:text-purple-100 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

// HTML details 折叠组件
function DetailsBlock({ children, ...props }: React.HTMLAttributes<HTMLDetailsElement>) {
  return (
    <details
      className="my-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 overflow-hidden group"
      {...props}
    >
      {children}
    </details>
  );
}

// HTML summary 组件
function SummaryBlock({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <summary
      className="px-4 py-3 cursor-pointer font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden"
      {...props}
    >
      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
      {children}
    </summary>
  );
}

// 自动补全不完整的思考标签（补全缺失的开头或闭合标签）
function autoCompleteThinkingTags(
  content: string,
  thinkingTags: ThinkingTagConfig[]
): string {
  let result = content;
  const enabledTags = thinkingTags.filter((tag) => tag.enabled);

  for (const tag of enabledTags) {
    const escapedOpen = tag.openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedClose = tag.closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 计算开始标签和结束标签的数量
    const openMatches = result.match(new RegExp(escapedOpen, 'gi')) || [];
    const closeMatches = result.match(new RegExp(escapedClose, 'gi')) || [];

    const openCount = openMatches.length;
    const closeCount = closeMatches.length;

    // 补全缺失的闭合标签（开头标签多于闭合标签时）
    if (openCount > closeCount) {
      const missingCount = openCount - closeCount;
      for (let i = 0; i < missingCount; i++) {
        result = result + tag.closeTag;
      }
    }
    // 补全缺失的开头标签（闭合标签多于开头标签时）
    else if (closeCount > openCount) {
      const missingCount = closeCount - openCount;
      for (let i = 0; i < missingCount; i++) {
        result = tag.openTag + result;
      }
    }
  }

  return result;
}

// 预处理：将思维链标签转换为特殊占位符
function preprocessThinkingBlocks(
  content: string,
  thinkingTags: ThinkingTagConfig[],
  autoComplete: boolean
): { processedContent: string; thinkingBlocks: string[] } {
  const thinkingBlocks: string[] = [];

  // 先自动补全不完整的标签
  let processedContent = autoComplete
    ? autoCompleteThinkingTags(content, thinkingTags)
    : content;

  const enabledTags = thinkingTags.filter((tag) => tag.enabled);

  for (const tag of enabledTags) {
    // 转义特殊正则字符
    const escapedOpen = tag.openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedClose = tag.closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 创建正则表达式匹配标签内容（支持多行）
    const regex = new RegExp(`${escapedOpen}([\\s\\S]*?)${escapedClose}`, 'gi');

    processedContent = processedContent.replace(regex, (_, innerContent) => {
      const index = thinkingBlocks.length;
      thinkingBlocks.push(innerContent.trim());
      // 使用特殊占位符
      return `\n\n___THINKING_BLOCK_${index}___\n\n`;
    });
  }

  return { processedContent, thinkingBlocks };
}

// 应用特殊字段渲染规则到文本
function applySpecialFieldRulesToText(
  text: string,
  rules: SpecialFieldRule[]
): React.ReactNode[] {
  const enabledRules = rules.filter((rule) => rule.enabled);

  if (enabledRules.length === 0) {
    return [text];
  }

  // 创建合并的正则表达式
  const results: React.ReactNode[] = [];
  let remainingText = text;
  let keyIndex = 0;

  while (remainingText.length > 0) {
    let earliestMatch: { index: number; length: number; fullMatch: string; captured: string; rule: SpecialFieldRule } | null = null;

    // 找到最早的匹配
    for (const rule of enabledRules) {
      try {
        const regex = new RegExp(rule.pattern, 'g');
        const match = regex.exec(remainingText);
        if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            fullMatch: match[0],
            captured: match[1] || match[0],
            rule,
          };
        }
      } catch (e) {
        console.warn(`Invalid regex pattern: ${rule.pattern}`, e);
      }
    }

    if (earliestMatch === null) {
      // 没有更多匹配
      results.push(remainingText);
      break;
    }

    // 添加匹配前的文本
    if (earliestMatch.index > 0) {
      results.push(remainingText.slice(0, earliestMatch.index));
    }

    // 添加高亮的匹配内容
    const style = earliestMatch.rule.style
      ? Object.fromEntries(
          earliestMatch.rule.style
            .split(';')
            .filter((s) => s.trim())
            .map((s) => {
              const [key, value] = s.split(':').map((x) => x.trim());
              const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              return [camelKey, value];
            })
        )
      : {};

    // 根据 keepDelimiters 决定显示完整匹配还是只显示捕获组内容
    const displayText = earliestMatch.rule.keepDelimiters
      ? earliestMatch.fullMatch
      : earliestMatch.captured;

    results.push(
      <span
        key={`special-${keyIndex++}`}
        className={earliestMatch.rule.className}
        style={style}
      >
        {displayText}
      </span>
    );

    // 继续处理剩余文本
    remainingText = remainingText.slice(earliestMatch.index + earliestMatch.length);
  }

  return results;
}

// 递归处理 React 节点，应用特殊字段规则
function processChildren(
  children: React.ReactNode,
  rules: SpecialFieldRule[]
): React.ReactNode {
  if (typeof children === 'string') {
    const processed = applySpecialFieldRulesToText(children, rules);
    return processed.length === 1 ? processed[0] : <>{processed}</>;
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <React.Fragment key={i}>{processChildren(child, rules)}</React.Fragment>
    ));
  }

  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<any>;
    // 不处理 code 元素内的内容
    if (element.type === 'code' || element.type === 'pre') {
      return children;
    }
    const newProps = {
      ...element.props,
      children: processChildren(element.props.children, rules),
    };
    return React.cloneElement(element, newProps);
  }

  return children;
}

/**
 * Markdown 渲染器组件
 */
export function MarkdownRenderer({ content, className = '', thinkingTagPrepend }: MarkdownRendererProps) {
  const {
    thinkingCollapsed,
    thinkingAutoComplete,
    thinkingTags,
    specialFieldRules,
    enableHtmlRendering,
  } = useUIPreferences();

  // 如果有持久化的前置标签，则在渲染时添加
  // 这个值来自消息完成时的 LLM 辅助判断结果，已经保存到消息数据中
  const contentToRender = thinkingTagPrepend
    ? thinkingTagPrepend + content
    : content;

  // 预处理思维链内容
  const { processedContent, thinkingBlocks } = useMemo(() => {
    return preprocessThinkingBlocks(contentToRender, thinkingTags, thinkingAutoComplete);
  }, [contentToRender, thinkingTags, thinkingAutoComplete]);

  // 将处理后的内容分割成片段
  const contentParts = useMemo(() => {
    const parts: Array<{ type: 'markdown' | 'thinking'; content: string; index?: number }> = [];
    const regex = /___THINKING_BLOCK_(\d+)___/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(processedContent)) !== null) {
      if (match.index > lastIndex) {
        const mdContent = processedContent.slice(lastIndex, match.index).trim();
        if (mdContent) {
          parts.push({ type: 'markdown', content: mdContent });
        }
      }
      const blockIndex = parseInt(match[1], 10);
      parts.push({ type: 'thinking', content: thinkingBlocks[blockIndex], index: blockIndex });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < processedContent.length) {
      const mdContent = processedContent.slice(lastIndex).trim();
      if (mdContent) {
        parts.push({ type: 'markdown', content: mdContent });
      }
    }

    if (parts.length === 0 && processedContent.trim()) {
      parts.push({ type: 'markdown', content: processedContent });
    }

    return parts;
  }, [processedContent, thinkingBlocks]);

  // 包装组件以应用特殊字段规则
  const wrapWithSpecialFields = (Component: React.ComponentType<any>) => {
    return ({ children, ...props }: any) => {
      const processedChildren = processChildren(children, specialFieldRules);
      return <Component {...props}>{processedChildren}</Component>;
    };
  };

  // 创建思维链标签的组件映射
  const thinkingTagComponents = useMemo(() => {
    const tagComponents: Record<string, React.ComponentType<any>> = {};

    // 提取所有唯一的标签名
    const tagNames = new Set<string>();
    thinkingTags.forEach(tag => {
      // 从 <tagname> 提取 tagname
      const openMatch = tag.openTag.match(/<(\w+)>/);
      if (openMatch) {
        tagNames.add(openMatch[1].toLowerCase());
      }
    });

    // 为每个标签创建组件
    tagNames.forEach(tagName => {
      tagComponents[tagName] = ({ children }: any) => (
        <span className="text-purple-600 dark:text-purple-400 italic">{children}</span>
      );
    });

    return tagComponents;
  }, [thinkingTags]);

  // 自定义组件渲染
  const components: Components = {
    // 代码块渲染
    code: ({ node, className: codeClassName, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';
      const inline = !codeClassName;

      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono break-all"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className="relative group my-4 max-w-full">
          {language && (
            <div className="absolute top-0 right-0 px-3 py-1 text-xs text-muted-foreground bg-muted rounded-bl z-10">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto p-4 rounded-lg bg-muted max-w-full">
            <code className={codeClassName} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    },

    // HTML details/summary 支持
    details: DetailsBlock as any,
    summary: SummaryBlock as any,

    // style 标签支持
    style: ({ children }: any) => (
      <style dangerouslySetInnerHTML={{ __html: String(children) }} />
    ),

    // 表格渲染
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto max-w-full">
        <table className="min-w-full border-collapse border border-border">
          {children}
        </table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="bg-muted">{children}</thead>
    ),

    tbody: ({ children }) => (
      <tbody className="divide-y divide-border">{children}</tbody>
    ),

    tr: ({ children }) => (
      <tr className="border-b border-border">{children}</tr>
    ),

    th: ({ children }) => (
      <th className="px-4 py-2 text-left font-semibold border border-border">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="px-4 py-2 border border-border">{children}</td>
    ),

    // 链接安全处理
    a: ({ href, children, ...props }) => {
      const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
      return (
        <a
          href={href}
          className="text-primary hover:underline break-all"
          {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
          {...props}
        >
          {children}
        </a>
      );
    },

    // 引用块
    blockquote: ({ children }) => (
      <blockquote className="relative pl-4 pr-3 py-3 my-4 rounded-r-lg bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary/50 text-muted-foreground italic">
        <div className="ml-4">{children}</div>
      </blockquote>
    ),

    // 列表
    ul: ({ children }) => (
      <ul className="list-disc list-inside my-4 space-y-2">{children}</ul>
    ),

    ol: ({ children }) => (
      <ol className="list-decimal list-inside my-4 space-y-2">{children}</ol>
    ),

    li: ({ children }) => <li className="ml-4">{children}</li>,

    // 标题
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold my-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-bold my-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-bold my-2">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold my-2">{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-base font-semibold my-2">{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-semibold my-2">{children}</h6>
    ),

    // 段落 - 应用特殊字段渲染
    p: wrapWithSpecialFields(({ children, ...props }: any) => (
      <p className="my-2 leading-relaxed break-words" {...props}>
        {children}
      </p>
    )),

    // span - 应用特殊字段渲染
    span: wrapWithSpecialFields(({ children, ...props }: any) => (
      <span {...props}>{children}</span>
    )),

    // 分隔线
    hr: () => <hr className="my-4 border-border" />,

    // 强调
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => (
      <del className="line-through text-muted-foreground">{children}</del>
    ),

    // div - 支持自定义样式
    div: ({ children, style, className: divClassName, ...props }: any) => (
      <div className={divClassName} style={style} {...props}>
        {children}
      </div>
    ),

    // 动态添加思维链标签组件（防止未完整匹配的标签报错）
    ...thinkingTagComponents,
  };

  // 渲染 Markdown 内容
  const renderMarkdown = (mdContent: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeRaw, { passThrough: [] }],
        rehypeHighlight,
        rehypeKatex,
      ]}
      components={components}
      skipHtml={!enableHtmlRendering}
    >
      {mdContent}
    </ReactMarkdown>
  );

  return (
    <div
      className={`markdown-renderer prose prose-sm dark:prose-invert max-w-full w-full overflow-hidden ${className}`}
    >
      {contentParts.map((part, index) => (
        <React.Fragment key={index}>
          {part.type === 'thinking' ? (
            <ThinkingBlock content={part.content} defaultCollapsed={thinkingCollapsed} />
          ) : (
            renderMarkdown(part.content)
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
