import { cn } from '@/lib/utils.js';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-100', className)} {...props} />
  );
}

export { Skeleton };
