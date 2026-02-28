import { Skeleton } from '../ui/Skeleton';

export function SupplierProfileSkeleton() {
    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                        <Skeleton className="h-20 w-20 rounded-2xl" />
                        <div className="space-y-3">
                            <Skeleton className="h-9 w-64" />
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-4 w-72 max-w-full" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-28" />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex gap-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-1.5">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-9 w-32 rounded-lg" />
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="mt-2 h-8 w-24" />
                            <Skeleton className="mt-2 h-3 w-32" />
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <Skeleton className="h-7 w-56" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                                    <Skeleton className="col-span-4 h-4 w-24" />
                                    <Skeleton className="col-span-3 h-4 w-20" />
                                    <Skeleton className="col-span-2 h-4 w-16" />
                                    <Skeleton className="col-span-3 h-5 w-24 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="mt-2 h-3 w-20" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <Skeleton className="h-7 w-32" />
                        <div className="mt-4 space-y-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="flex gap-3">
                                    <Skeleton className="h-4 w-4" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-28" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <Skeleton className="h-7 w-40" />
                        <div className="mt-4 space-y-4 border-l border-gray-200 pl-4">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div key={index} className="space-y-2">
                                    <Skeleton className="h-4 w-44" />
                                    <Skeleton className="h-3 w-28" />
                                    <Skeleton className="h-3 w-56" />
                                </div>
                            ))}
                        </div>
                        <Skeleton className="mt-4 h-10 w-full" />
                    </div>
                </div>
            </section>
        </div>
    );
}
