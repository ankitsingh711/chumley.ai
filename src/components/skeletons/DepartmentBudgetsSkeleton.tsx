import { Skeleton } from '../ui/Skeleton';

export function DepartmentBudgetsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-3 h-10 w-96 max-w-full" />
                <Skeleton className="mt-2 h-4 w-[32rem] max-w-full" />

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
                    <div className="mb-6">
                        <Skeleton className="h-6 w-56" />
                        <Skeleton className="mt-2 h-4 w-72" />
                    </div>

                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <Skeleton className="h-5 w-36" />
                                        <Skeleton className="mt-2 h-3 w-52" />
                                    </div>
                                    <div className="text-right">
                                        <Skeleton className="h-6 w-14" />
                                        <Skeleton className="mt-1 h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="mt-3 h-2.5 w-full" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <Skeleton className="h-6 w-44" />
                        <Skeleton className="mt-2 h-4 w-52" />
                        <Skeleton className="mt-4 h-[320px] w-full" />
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <Skeleton className="h-6 w-36" />
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
