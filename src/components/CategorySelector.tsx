import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { Category, CategoryTree } from '../types/category';
import { categoryService } from '../services/category.service';
import { cn } from '../lib/utils';
import { ChevronDown, ChevronRight, Loader2, Search, Check, X } from 'lucide-react';

interface CategorySelectorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    value: string;
    onChange: (categoryId: string) => void;
    departmentId?: string;
    label?: string;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
}

interface FlattenedCategory extends Category {
    depth: number;
    hasChildren: boolean;
    path: string[];
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
    value,
    onChange,
    departmentId,
    label,
    error,
    placeholder = 'Select a category',
    className,
    disabled
}) => {
    const [categories, setCategories] = useState<CategoryTree>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch categories when department changes
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

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input on open
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Flatten tree helper for search and lookup
    const flattenedCategories = useMemo(() => {
        const result: FlattenedCategory[] = [];

        const traverse = (nodes: CategoryTree, depth = 0, path: string[] = []) => {
            nodes.forEach(node => {
                const currentPath = [...path, node.name];
                result.push({
                    ...node,
                    depth,
                    hasChildren: !!(node.children && node.children.length > 0),
                    path: currentPath
                });

                if (node.children) {
                    traverse(node.children, depth + 1, currentPath);
                }
            });
        };

        traverse(categories);
        return result;
    }, [categories]);

    // Find selected category name
    const selectedCategory = useMemo(() => {
        return flattenedCategories.find(c => c.id === value);
    }, [flattenedCategories, value]);

    // Filter categories based on search
    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categories;

        // Improve search: flattening allows searching leaf nodes and showing path
        // Just filter the flattened list for simplicity in search mode
        return flattenedCategories.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.path.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [categories, flattenedCategories, searchQuery]);

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedNodes(newExpanded);
    };

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearchQuery('');
    };

    // Render tree node recursively
    const renderNode = (node: Category) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = value === node.id;

        return (
            <div key={node.id} className="select-none">
                <div
                    className={cn(
                        "flex items-center py-1.5 pr-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm transition-colors",
                        isSelected && "bg-primary-50 text-primary-700 font-medium"
                    )}
                    style={{ paddingLeft: `${(searchQuery ? 0 : 0) + 0.5}rem` }} // No indent in search mode? Or keep it? keeping recursion for normal mode
                    onClick={() => handleSelect(node.id)}
                >
                    {/* Expand/Collapse Arrow */}
                    <div
                        className={cn(
                            "p-1 mr-1 rounded-sm hover:bg-gray-200 text-gray-400 flex-shrink-0",
                            !hasChildren && "invisible"
                        )}
                        onClick={(e) => hasChildren && toggleExpand(e, node.id)}
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>

                    <span className="truncate flex-1">{node.name}</span>

                    {isSelected && <Check className="h-4 w-4 text-primary-600 ml-2 flex-shrink-0" />}
                </div>

                {/* Children */}
                {hasChildren && isExpanded && !searchQuery && (
                    <div className="border-l border-gray-100 ml-4 pl-0">
                        {node.children!.map(child => renderNode(child))}
                    </div>
                )}
            </div>
        );
    };

    // Render logic for search mode (flat list) vs normal tree mode
    const renderContent = () => {
        if (!categories.length) {
            return (
                <div className="p-4 text-center text-sm text-gray-500">
                    No categories found
                </div>
            );
        }

        if (searchQuery) {
            // Flat list for search results
            if (filteredCategories.length === 0) {
                return (
                    <div className="p-4 text-center text-sm text-gray-500">
                        No matches found
                    </div>
                );
            }

            return (filteredCategories as FlattenedCategory[]).map(node => (
                <div
                    key={node.id}
                    className={cn(
                        "flex flex-col py-2 px-3 rounded-md hover:bg-gray-100 cursor-pointer text-sm transition-colors border-b border-gray-50 last:border-0",
                        value === node.id && "bg-primary-50"
                    )}
                    onClick={() => handleSelect(node.id)}
                >
                    <div className="flex items-center justify-between">
                        <span className={cn("font-medium", value === node.id ? "text-primary-700" : "text-gray-900")}>
                            {node.name}
                        </span>
                        {value === node.id && <Check className="h-4 w-4 text-primary-600" />}
                    </div>

                    <span className="text-xs text-gray-400 mt-0.5 truncate">
                        {node.path.slice(0, -1).join(' > ')}
                    </span>
                </div>
            ));
        }

        return categories.map(node => renderNode(node));
    };

    const isDisabled = disabled || loading || !departmentId;

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            {label && (
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {label} {error && <span className="text-red-500">*</span>}
                </label>
            )}

            <div
                className={cn(
                    "flex min-h-[42px] w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition-all outline-none cursor-pointer",
                    isOpen ? "border-primary-500 ring-2 ring-primary-100" : "border-gray-200 hover:border-gray-300",
                    isDisabled && "cursor-not-allowed opacity-50 bg-gray-50",
                    error && "border-red-500 hover:border-red-500 focus:border-red-500 ring-red-100"
                )}
                onClick={() => !isDisabled && setIsOpen(!isOpen)}
            >
                <span className={cn("truncate", !selectedCategory && "text-gray-400")}>
                    {loading ? 'Loading categories...' : (selectedCategory ? selectedCategory.name : placeholder)}
                </span>
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                    <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
                )}
            </div>

            {/* Dropdown Popover */}
            {isOpen && !isDisabled && (
                <div className="absolute z-50 mt-2 w-full min-w-[300px] rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                        {renderContent()}
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {fetchError && <p className="mt-1 text-xs text-red-500">{fetchError}</p>}
        </div>
    );
};
