import type { ReactNode } from 'react';
import { cn } from '@/lib/helpers';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className, onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl bg-white border border-gray-200/80 shadow-sm',
        hover && 'transition-all hover:shadow-md hover:border-[#004883]/30 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-4 sm:p-5', className)}>{children}</div>;
}
