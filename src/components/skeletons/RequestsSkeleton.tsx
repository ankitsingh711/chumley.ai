import { Skeleton } from '../ui/Skeleton';

export function RequestsSkeleton() {
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
                            <Skeleton className="mt-3 h-8 w-20" />
                            <Skeleton className="mt-2 h-3 w-28" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="space-y-4 border-b border-gray-100 p-5">
                    <div className="flex flex-wrap gap-2">
                        <Skeleton className="h-8 w-28 rounded-full" />
                        <Skeleton className="h-8 w-28 rounded-full" />
                        <Skeleton className="h-8 w-24 rounded-full" />
                        <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <Skeleton className="h-11 w-full lg:max-w-md" />
                        <Skeleton className="h-10 w-36" />
                    </div>
                </div>

                <div className="px-5 py-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 border-b border-gray-100 py-4 last:border-b-0">
                            <Skeleton className="col-span-2 h-5" />
                            <Skeleton className="col-span-2 h-5" />
                            <Skeleton className="col-span-2 h-5" />
                            <Skeleton className="col-span-2 h-5" />
                            <Skeleton className="col-span-1 h-5" />
                            <Skeleton className="col-span-2 h-5" />
                            <Skeleton className="col-span-1 h-8" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
