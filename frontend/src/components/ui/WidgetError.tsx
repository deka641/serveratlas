'use client';

interface WidgetErrorProps {
  message?: string;
  onRetry?: () => void;
}

export default function WidgetError({ message = 'Failed to load', onRetry }: WidgetErrorProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
      <svg className="h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm text-red-700">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
