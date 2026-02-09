import React, { useEffect, useState } from 'react';
import type { Category, CategoryTree } from '../types/category';
import { categoryService } from '../services/category.service';
import { cn } from '../lib/utils';
import { ChevronDown, Loader2 } from 'lucide-react';

interface CategorySelectorProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    value: string;
    onChange: (categoryId: string) => void;
    departmentId?: string; // If provided, fetches categories for this department
    label?: string;
    error?: string;
    placeholder?: string;
    className?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
    value,
    onChange,
    departmentId,
    label,
    error,
    placeholder = 'Select a category',
    className,
    disabled,
    ...props
}) => {
    const [categories, setCategories] = useState<CategoryTree>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');

    useEffect(() => {
        let mounted = true;

        const fetchCategories = async () => {
            if (!departmentId) {
                setCategories([]);
                return;
            }

            try {
                setLoading(true);
                setFetchError('');
                const tree = await categoryService.getCategoryTree(departmentId);
                if (mounted) {
                    setCategories(tree);
                }
            } catch (err) {
                if (mounted) {
                    console.error('Failed to load categories', err);
                    setFetchError('Failed to load categories');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchCategories();

        return () => {
            mounted = false;
        };
    }, [departmentId]);

    // Recursive function to render options with indentation
    const renderOptions = (nodes: CategoryTree, depth = 0) => {
        return nodes.flatMap((node) => {
            // Indentation using non-breaking spaces
            const indent = '\u00A0'.repeat(depth * 4);
            const prefix = depth > 0 ? '└─ ' : '';

            const options = [
                <option key={node.id} value={node.id}>
                    {indent}{prefix}{node.name}
                </option>
            ];

            if (node.children && node.children.length > 0) {
                options.push(...renderOptions(node.children, depth + 1));
            }

            return options;
        });
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <label className="text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || loading || !departmentId}
                    className={cn(
                        "w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:bg-gray-50",
                        error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                    )}
                    {...props}
                >
                    <option value="" disabled>
                        {loading ? 'Loading categories...' : placeholder}
                    </option>
                    {!loading && !fetchError && renderOptions(categories)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </div>
            </div>
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
            {fetchError && (
                <p className="text-sm text-red-600">{fetchError}</p>
            )}
        </div>
    );
};
