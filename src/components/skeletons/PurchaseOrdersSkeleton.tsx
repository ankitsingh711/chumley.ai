import { Skeleton } from '../ui/Skeleton';
import { SkeletonTable } from '../ui/SkeletonTable';

export function PurchaseOrdersSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex gap-4">
                    <Skeleton className="h-10 flex-1 max-w-xs" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>

            {/* Orders Table */}
            <SkeletonTable rows={8} columns={6} />
        </div>
    );
}
