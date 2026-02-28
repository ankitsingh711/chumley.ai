import { Skeleton } from '../ui/Skeleton';

export function ContractsSkeleton() {
    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/60 to-accent-50/70 p-6 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-9 w-72" />
                        <Skeleton className="h-4 w-[34rem] max-w-full" />
                    </div>
                    <Skeleton className="h-10 w-36" />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="mt-2 h-8 w-20" />
                            <Skeleton className="mt-2 h-3 w-24" />
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <Skeleton className="h-11 w-full xl:max-w-md" />
                        <div className="flex gap-2">
                            <Skeleton className="h-11 w-52" />
                            <Skeleton className="h-11 w-20" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className="h-8 w-28 rounded-full" />
                        ))}
                    </div>
                    <Skeleton className="h-8 w-full" />
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>

                        <Skeleton className="h-6 w-3/4" />
                        <div className="mt-3 flex items-center gap-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                        </div>

                        <Skeleton className="mt-4 h-4 w-full" />
                        <Skeleton className="mt-2 h-4 w-2/3" />

                        <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}
