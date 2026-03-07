import { Skeleton } from "@/components/ui/skeleton";

export default function WelcomeLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6">
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-4 h-12 w-40 rounded-xl" />
    </div>
  );
}
