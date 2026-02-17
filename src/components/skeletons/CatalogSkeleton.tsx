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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <Skeleton className="h-48 w-full rounded-lg mb-4" />
                        <Skeleton className="h-5 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
