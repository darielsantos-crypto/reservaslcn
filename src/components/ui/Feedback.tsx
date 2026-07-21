import { cn } from '@/lib/helpers';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20 text-[#004883]">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      {icon && <div className="mb-3 text-gray-300">{icon}</div>}
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-500 max-w-sm">{description}</p>}
    </div>
  );
}
