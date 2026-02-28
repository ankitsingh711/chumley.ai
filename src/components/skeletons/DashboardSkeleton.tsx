import { Skeleton } from '../ui/Skeleton';

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-3 h-10 w-72" />
                <Skeleton className="mt-2 h-4 w-96 max-w-full" />

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="mt-3 h-8 w-24" />
                            <Skeleton className="mt-2 h-3 w-32" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <Skeleton className="h-6 w-56" />
                            <Skeleton className="mt-2 h-4 w-72" />
                        </div>
                        <Skeleton className="h-8 w-28" />
                    </div>

                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <Skeleton className="h-5 w-36" />
                                        <Skeleton className="mt-2 h-3 w-48" />
                                    </div>
                                    <div className="text-right">
                                        <Skeleton className="h-6 w-14" />
                                        <Skeleton className="mt-1 h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="mt-3 h-2.5 w-full" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <Skeleton className="h-6 w-40" />
                        <div className="mt-4 flex items-center justify-center">
                            <Skeleton variant="circle" className="h-40 w-40" />
                        </div>
                        <div className="mt-4 space-y-2">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-10" />
                                    </div>
                                    <Skeleton className="mt-2 h-1.5 w-full" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <Skeleton className="h-6 w-44" />
                        <Skeleton className="mt-2 h-4 w-full" />
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                        </div>
                        <Skeleton className="mt-5 h-10 w-full" />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <Skeleton className="h-6 w-56" />
                        <Skeleton className="mt-2 h-4 w-72" />
                    </div>
                    <Skeleton className="h-8 w-32" />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 border-b border-gray-100 py-3 last:border-b-0">
                            <Skeleton className="col-span-2 h-5" />
                            <Skeleton className="col-span-3 h-5" />
                            <Skeleton className="col-span-2 h-5" />
                            <Skeleton className="col-span-2 h-5" />
                            <Skeleton className="col-span-3 h-5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
