'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/utils';

interface CopyableTextProps {
  text: string;
  className?: string;
}

export default function CopyableText({ text, className = '' }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <span className={`group inline-flex items-center gap-1.5 ${className}`}>
      <span>{text}</span>
      <button
        onClick={handleCopy}
        className="inline-flex opacity-0 transition-opacity group-hover:opacity-100"
        title="Copy to clipboard"
        type="button"
      >
        {copied ? (
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </span>
  );
}
