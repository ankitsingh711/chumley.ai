import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'circle' | 'text';
}

export function Skeleton({
    className,
    variant = 'default',
    ...props
}: SkeletonProps) {
    return (
        <div
            aria-busy="true"
            aria-live="polite"
            className={cn(
                "animate-pulse bg-gray-200",
                variant === 'circle' && "rounded-full",
                variant === 'text' && "rounded h-4",
                variant === 'default' && "rounded-md",
                className
            )}
            {...props}
        />
    );
}
