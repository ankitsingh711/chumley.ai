import { Skeleton } from '../ui/Skeleton';

export function SuppliersSkeleton() {
    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-4 w-[30rem] max-w-full" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-28" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="mt-3 h-8 w-16" />
                            <Skeleton className="mt-2 h-3 w-28" />
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <Skeleton className="h-11 w-full lg:max-w-md" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                    <div className="flex gap-2 overflow-hidden">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <Skeleton key={index} className="h-8 w-28 rounded-full" />
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-start justify-between">
                            <Skeleton className="h-12 w-12 rounded-xl" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>

                        <div className="mb-5 space-y-2">
                            <Skeleton className="h-7 w-44" />
                            <Skeleton className="h-4 w-20" />
                        </div>

                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <Skeleton variant="circle" className="h-10 w-10" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-gray-100 p-3">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="mt-2 h-8 w-12" />
                            </div>
                            <div className="rounded-lg border border-gray-100 p-3">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="mt-2 h-8 w-20" />
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
