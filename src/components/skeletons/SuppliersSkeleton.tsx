import { Skeleton } from '../ui/Skeleton';

export function SuppliersSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Search Bar */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <Skeleton className="h-10 w-full" />
            </div>

            {/* Supplier Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        {/* Icon and status */}
                        <div className="flex justify-between items-start mb-4">
                            <Skeleton className="h-12 w-12 rounded-xl" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>

                        {/* Title */}
                        <div className="mb-6">
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>

                        {/* Contact */}
                        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-50">
                            <Skeleton variant="circle" className="h-8 w-8" />
                            <div className="flex-1">
                                <Skeleton className="h-4 w-24 mb-1" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <Skeleton className="h-3 w-20 mb-1" />
                                <Skeleton className="h-7 w-12" />
                            </div>
                            <div>
                                <Skeleton className="h-3 w-20 mb-1" />
                                <Skeleton className="h-7 w-16" />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
