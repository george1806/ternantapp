import { cn } from '@/lib/utils';

/**
 * Skeleton Component
 *
 * Best Practices:
 * - Loading state indicator
 * - Improves perceived performance
 * - Prevents layout shift
 * - Matches content structure
 */

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
