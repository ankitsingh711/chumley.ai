import { Skeleton } from '../ui/Skeleton';

export function SupplierProfileSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-8 w-48" />
            </div>

            {/* Profile Card */}
            <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-20 w-20 rounded-xl" />
                        <div>
                            <Skeleton className="h-8 w-48 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i}>
                            <Skeleton className="h-3 w-20 mb-2" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                    ))}
                </div>

                {/* Contact Section */}
                <div className="space-y-4">
                    <Skeleton className="h-6 w-32 mb-4" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24" />
                ))}
            </div>

            {/* Content Area */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i}>
                            <Skeleton className="h-5 w-32 mb-2" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
