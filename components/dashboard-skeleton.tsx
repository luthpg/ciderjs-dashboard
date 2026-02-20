import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 container mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: key for skeleton
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
