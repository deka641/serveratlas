'use client';

import { TextareaHTMLAttributes, forwardRef, useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...rest }, ref) => {
    const generatedId = useId();
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
    const errorId = `${textareaId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            {label}
            {rest.required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
          rows={4}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required={rest.required || undefined}
          {...rest}
        />
        {error && <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
