import { Skeleton } from '../ui/Skeleton';

export function CatalogSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Search */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <Skeleton className="h-10 w-full max-w-md" />
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div>
                                    <Skeleton className="h-5 w-32 mb-1" />
                                    <Skeleton className="h-4 w-20 rounded-full" />
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Skeleton className="h-7 w-7 rounded-lg" />
                                <Skeleton className="h-7 w-7 rounded-lg" />
                            </div>
                        </div>
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
