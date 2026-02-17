import { SkeletonCard } from '../ui/SkeletonCard';
import { SkeletonTable } from '../ui/SkeletonTable';
import { Skeleton } from '../ui/Skeleton';

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats Row - 4 cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Budget Tracker - 2 cols wide */}
                <div className="lg:col-span-2">
                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                        <div className="space-y-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i}>
                                    <div className="mb-2 flex items-end justify-between">
                                        <div>
                                            <Skeleton className="h-5 w-32 mb-1" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                        <div className="text-right">
                                            <Skeleton className="h-5 w-12 mb-1" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-2 w-full rounded-full" />
                                    <div className="mt-1 flex justify-between">
                                        <Skeleton className="h-2 w-20" />
                                        <Skeleton className="h-2 w-20" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Request Breakdown - 1 col */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <Skeleton className="h-6 w-40 mb-4" />
                        <div className="relative h-48 flex items-center justify-center">
                            <Skeleton variant="circle" className="h-40 w-40" />
                        </div>
                        <div className="mt-4 space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Skeleton variant="circle" className="h-2 w-2" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Requests Table */}
            <SkeletonTable rows={5} columns={5} />
        </div>
    );
}
