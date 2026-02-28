import { Skeleton } from '../ui/Skeleton';

export function CatalogSkeleton() {
    return (
        <>
            {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-11 w-11 rounded-xl" />
                            <div>
                                <Skeleton className="mb-2 h-5 w-36" />
                                <Skeleton className="h-4 w-24 rounded-full" />
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                    </div>

                    <Skeleton className="mb-2 h-4 w-full" />
                    <Skeleton className="mb-5 h-4 w-3/4" />

                    <div className="space-y-3 border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
