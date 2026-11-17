import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Highlight, Prism, themes } from 'prism-react-renderer';
import { copyText } from '../../lib/share';
import { cn } from '../../lib/utils';

interface CodeBlockProps {
  code: string;
  language: string;
  isDark: boolean;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  'c++': 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  cc: 'cpp',
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  py: 'python',
  yml: 'yaml',
  md: 'markdown',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  vue: 'markup',
  plaintext: 'markup',
  text: 'markup',
  txt: 'markup',
};

function resolveLanguage(language: string): string {
  const normalized = (language || 'text').toLowerCase();
  const mapped = LANGUAGE_ALIASES[normalized] || normalized;
  return Prism.languages[mapped] ? mapped : 'markup';
}

/** 跟随主题的代码块：Prism 高亮 + 一键复制。 */
export function CodeBlock({ code, language, isDark }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const theme = isDark ? themes.vsDark : themes.github;
  const resolved = resolveLanguage(language);
  const label = (language || 'text').toLowerCase();

  const handleCopy = async () => {
    const ok = await copyText(code);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className="code-block group/code relative my-4 overflow-hidden rounded-xl border border-border/70 shadow-[0_16px_40px_-28px_hsl(var(--glass-shadow)/0.7)]"
      style={{ backgroundColor: theme.plain.backgroundColor, color: theme.plain.color }}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b px-3.5 py-2',
          isDark ? 'border-white/10 bg-white/[0.03]' : 'border-black/[0.06] bg-black/[0.03]',
        )}
      >
        <span className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] opacity-60">
          <span className="h-1.5 w-1.5 rounded-full bg-focus/70" />
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="复制代码"
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-medium transition-colors',
            isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]',
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>

      <Highlight theme={theme} code={code} language={resolved}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn('code-block-pre overflow-x-auto p-4 text-[12.5px] leading-[1.75]', className)}
            style={{ ...style, background: 'transparent' }}
          >
            <code>
              {tokens.map((line, lineIndex) => (
                <div key={lineIndex} {...getLineProps({ line })}>
                  {line.map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}
