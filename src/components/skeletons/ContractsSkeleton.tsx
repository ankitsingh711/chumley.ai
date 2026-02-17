import { Skeleton } from '../ui/Skeleton';

export function ContractsSkeleton() {
    return (
        <>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                    </div>

                    {/* Title */}
                    <Skeleton className="h-6 w-full mb-2" />

                    {/* Supplier */}
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
