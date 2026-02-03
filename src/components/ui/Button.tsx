import * as React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';


// Note: I will install class-variance-authority for easier variant management
// If cva is not installed, I can implement it manually or just use clsx.
// Since I didn't install cva, I will implement a simpler version or just install it.
// To save time, I will assume I can install it or implement manual classes.
// I'll implement manual classes for now to avoid another install step if possible, 
// but cva is standard. Let's install it quickly using run_command in parallel if needed?
// No, I'll just use manual standard props.

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm',
            secondary: 'bg-primary-50 text-primary-900 hover:bg-primary-100',
            outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
            ghost: 'hover:bg-gray-100 text-gray-700',
            danger: 'bg-red-600 text-white hover:bg-red-700',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs',
            md: 'h-10 px-4 py-2',
            lg: 'h-12 px-6 text-lg',
            icon: 'h-10 w-10 p-2 flex items-center justify-center',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
