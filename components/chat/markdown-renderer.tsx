'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown 渲染器组件
 * 
 * 功能：
 * - Markdown 基础语法渲染
 * - GFM (GitHub Flavored Markdown) 支持（表格、删除线等）
 * - 代码块语法高亮（使用 highlight.js）
 * - LaTeX 数学公式渲染（使用 KaTeX）
 * - 安全链接处理（添加 rel 和 target 属性）
 * - 明暗主题自动适配
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // 自定义组件渲染
  const components: Components = {
    // 代码块渲染
    code: ({ node, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const inline = !className;
      
      if (inline) {
        // 行内代码
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono break-all"
            {...props}
          >
            {children}
          </code>
        );
      }
      
      // 代码块
      return (
        <div className="relative group my-4 max-w-full">
          {language && (
            <div className="absolute top-0 right-0 px-3 py-1 text-xs text-muted-foreground bg-muted rounded-bl z-10">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto p-4 rounded-lg bg-muted max-w-full">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    },
    
    // 表格渲染
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto max-w-full">
        <table className="min-w-full border-collapse border border-border">
          {children}
        </table>
      </div>
    ),
    
    thead: ({ children }) => (
      <thead className="bg-muted">
        {children}
      </thead>
    ),
    
    tbody: ({ children }) => (
      <tbody className="divide-y divide-border">
        {children}
      </tbody>
    ),
    
    tr: ({ children }) => (
      <tr className="border-b border-border">
        {children}
      </tr>
    ),
    
    th: ({ children }) => (
      <th className="px-4 py-2 text-left font-semibold border border-border">
        {children}
      </th>
    ),
    
    td: ({ children }) => (
      <td className="px-4 py-2 border border-border">
        {children}
      </td>
    ),
    
    // 链接安全处理
    a: ({ href, children, ...props }) => {
      // 检查是否为外部链接
      const isExternal = href?.startsWith('http://') || href?.startsWith('https://');

      return (
        <a
          href={href}
          className="text-primary hover:underline break-all"
          // 外部链接添加安全属性
          {...(isExternal && {
            target: '_blank',
            rel: 'noopener noreferrer'
          })}
          {...props}
        >
          {children}
        </a>
      );
    },
    
    // 引用块
    blockquote: ({ children }) => (
      <blockquote className="pl-4 my-4 border-l-4 border-primary/30 text-muted-foreground italic">
        {children}
      </blockquote>
    ),
    
    // 列表
    ul: ({ children }) => (
      <ul className="list-disc list-inside my-4 space-y-2">
        {children}
      </ul>
    ),
    
    ol: ({ children }) => (
      <ol className="list-decimal list-inside my-4 space-y-2">
        {children}
      </ol>
    ),
    
    li: ({ children }) => (
      <li className="ml-4">
        {children}
      </li>
    ),
    
    // 标题
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold my-4">
        {children}
      </h1>
    ),
    
    h2: ({ children }) => (
      <h2 className="text-2xl font-bold my-3">
        {children}
      </h2>
    ),
    
    h3: ({ children }) => (
      <h3 className="text-xl font-bold my-2">
        {children}
      </h3>
    ),
    
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold my-2">
        {children}
      </h4>
    ),
    
    h5: ({ children }) => (
      <h5 className="text-base font-semibold my-2">
        {children}
      </h5>
    ),
    
    h6: ({ children }) => (
      <h6 className="text-sm font-semibold my-2">
        {children}
      </h6>
    ),
    
    // 段落
    p: ({ children }) => (
      <p className="my-2 leading-relaxed break-words">
        {children}
      </p>
    ),
    
    // 分隔线
    hr: () => (
      <hr className="my-4 border-border" />
    ),
    
    // 强调
    strong: ({ children }) => (
      <strong className="font-bold">
        {children}
      </strong>
    ),
    
    em: ({ children }) => (
      <em className="italic">
        {children}
      </em>
    ),
    
    // 删除线（GFM）
    del: ({ children }) => (
      <del className="line-through text-muted-foreground">
        {children}
      </del>
    ),
  };

  return (
    <div className={`markdown-renderer prose prose-sm dark:prose-invert max-w-full w-full overflow-hidden ${className}`}>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,      // GitHub Flavored Markdown（表格、删除线等）
          remarkMath,     // 数学公式支持
        ]}
        rehypePlugins={[
          rehypeHighlight, // 代码语法高亮
          rehypeKatex,     // LaTeX 公式渲染
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}