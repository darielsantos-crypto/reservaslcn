import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/helpers';

const baseField =
  'w-full rounded-xl border border-gray-300 bg-white px-3.5 text-gray-900 placeholder-gray-400 transition focus:border-[#004883] focus:outline-none focus:ring-2 focus:ring-[#004883]/20 disabled:bg-gray-50 disabled:text-gray-500';

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn('block text-sm font-medium text-gray-700 mb-1.5', className)}>
      {children}
    </label>
  );
}

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <div>
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-600"> *</span>}
        </Label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseField, 'h-12', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseField, 'min-h-[88px] py-2.5', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseField, 'h-12 pr-9 appearance-none bg-no-repeat', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.75rem center',
      }}
      {...rest}
    >
      {children}
    </select>
  );
}
