import { Skeleton } from '../ui/Skeleton';

export function CreateRequestSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Form */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
                {/* Category Selection */}
                <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>

                {/* Reason */}
                <div>
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-24 w-full" />
                </div>

                {/* Items Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-9 w-28" />
                    </div>

                    {/* Item Rows */}
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-2">
                                    <Skeleton className="h-4 w-20 mb-2" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div>
                                    <Skeleton className="h-4 w-16 mb-2" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div>
                                    <Skeleton className="h-4 w-20 mb-2" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Attachments */}
                <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-32 w-full border-2 border-dashed rounded-lg" />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </div>
    );
}
