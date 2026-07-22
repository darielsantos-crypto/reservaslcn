import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/helpers';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full bg-white shadow-xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl',
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100 shrink-0 safe-top">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} aria-label="Fechar" className="h-10 w-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4">{children}</div>
        {footer && (
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-100 flex gap-2 justify-end shrink-0 bg-white safe-bottom [&>button]:flex-1 sm:[&>button]:flex-none">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
