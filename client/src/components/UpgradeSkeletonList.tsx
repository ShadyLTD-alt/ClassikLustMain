import { Skeleton } from "@/components/ui/skeleton";

export function UpgradeSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 rounded border border-purple-500/20 bg-black/30">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-32 bg-purple-900/40" />
            <Skeleton className="h-5 w-12 bg-purple-900/40" />
          </div>
          <Skeleton className="h-2 w-full bg-purple-900/40" />
          <div className="flex justify-between mt-2">
            <Skeleton className="h-3 w-20 bg-purple-900/40" />
            <Skeleton className="h-3 w-10 bg-purple-900/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
