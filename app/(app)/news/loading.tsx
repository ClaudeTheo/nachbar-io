import { Skeleton } from "@/components/ui/skeleton";

export default function NewsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-36" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-white p-3 shadow-sm">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-2 h-5 w-3/4" />
            <Skeleton className="mt-1 h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
