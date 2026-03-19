'use client';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeUrl(url: string): string {
  const decoded = url.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  const trimmed = decoded.trim().toLowerCase();
  if (trimmed.startsWith('http:') || trimmed.startsWith('https:') || trimmed.startsWith('mailto:') || trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return url;
  }
  return '#';
}

function parseInline(text: string): string {
  let result = escapeHtml(text);

  // Inline code (must come before bold/italic to avoid conflicts inside backticks)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (but not inside words for underscores)
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');

  // Links: [text](url) — sanitize URL protocol
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match: string, text: string, url: string) => {
      const sanitized = sanitizeUrl(url);
      return `<a href="${sanitized}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  );

  return result;
}

function parseMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing ```
      const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
      html.push(`<pre${langAttr}><code>${codeLines.join('\n')}</code></pre>`);
      continue;
    }

    // Blank lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${parseInline(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      html.push('<hr />');
      i++;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('> ')) {
        quoteLines.push(lines[i].trimStart().slice(2));
        i++;
      }
      html.push(`<blockquote>${quoteLines.map(l => `<p>${parseInline(l)}</p>`).join('')}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      html.push(`<ul>${items.map(item => `<li>${parseInline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      html.push(`<ol>${items.map(item => `<li>${parseInline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph: collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trimStart().startsWith('```') &&
      !lines[i].match(/^#{1,3}\s+/) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trimStart().startsWith('> ') &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      html.push(`<p>${paraLines.map(l => parseInline(l)).join('<br />')}</p>`);
    }
  }

  return html.join('\n');
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = parseMarkdown(content);

  return (
    <>
      <style>{`
        .markdown-content h1 {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 2rem;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #111827;
        }
        .markdown-content h2 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.75rem;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .markdown-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          line-height: 1.5rem;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .markdown-content h1:first-child,
        .markdown-content h2:first-child,
        .markdown-content h3:first-child {
          margin-top: 0;
        }
        .markdown-content p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.625;
          color: #374151;
        }
        .markdown-content a {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .markdown-content a:hover {
          color: #1d4ed8;
        }
        .markdown-content strong {
          font-weight: 600;
          color: #111827;
        }
        .markdown-content em {
          font-style: italic;
        }
        .markdown-content code {
          font-size: 0.875em;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          background-color: #f3f4f6;
          color: #dc2626;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          border: 1px solid #e5e7eb;
        }
        .markdown-content pre {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          padding: 1rem;
          overflow-x: auto;
          border-radius: 0.5rem;
          background-color: #1f2937;
          border: 1px solid #374151;
        }
        .markdown-content pre code {
          font-size: 0.8125rem;
          line-height: 1.625;
          background-color: transparent;
          color: #e5e7eb;
          padding: 0;
          border: none;
          border-radius: 0;
        }
        .markdown-content ul {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1.5rem;
          list-style-type: disc;
          color: #374151;
        }
        .markdown-content ol {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1.5rem;
          list-style-type: decimal;
          color: #374151;
        }
        .markdown-content li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          line-height: 1.625;
        }
        .markdown-content blockquote {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          padding-left: 1rem;
          border-left: 4px solid #d1d5db;
          color: #6b7280;
          font-style: italic;
        }
        .markdown-content blockquote p {
          color: #6b7280;
        }
        .markdown-content hr {
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          border: none;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
      <div
        className={`markdown-content text-sm ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
