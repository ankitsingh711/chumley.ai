import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

type PageToken = number | 'ellipsis-left' | 'ellipsis-right';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
}

function getPaginationTokens(currentPage: number, totalPages: number): PageToken[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const tokens: PageToken[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
        tokens.push('ellipsis-left');
    }

    for (let page = start; page <= end; page += 1) {
        tokens.push(page);
    }

    if (end < totalPages - 1) {
        tokens.push('ellipsis-right');
    }

    tokens.push(totalPages);

    return tokens;
}

export function Pagination({ currentPage, totalPages, total, limit, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const startItem = total === 0 ? 0 : (currentPage - 1) * limit + 1;
    const endItem = total === 0 ? 0 : Math.min(currentPage * limit, total);

    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;

    const pageTokens = getPaginationTokens(currentPage, totalPages);

    const goToPage = (page: number) => {
        const boundedPage = Math.min(totalPages, Math.max(1, page));
        onPageChange(boundedPage);
    };

    const navButtonClass =
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-primary-200 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-white to-primary-50/30 p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-900">
                        Showing {startItem} to {endItem} of {total} results
                    </p>
                    <p className="text-xs text-gray-500">Page {currentPage} of {totalPages}</p>
                </div>

                <nav className="flex flex-wrap items-center gap-1.5" aria-label="Pagination">
                    <button
                        onClick={() => goToPage(1)}
                        disabled={isFirstPage}
                        className={navButtonClass}
                        title="First page"
                        aria-label="Go to first page"
                    >
                        <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={isFirstPage}
                        className={navButtonClass}
                        title="Previous page"
                        aria-label="Go to previous page"
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {pageTokens.map((token, index) => {
                        if (typeof token !== 'number') {
                            return (
                                <span
                                    key={`${token}-${index}`}
                                    className="inline-flex h-9 w-6 items-center justify-center text-sm text-gray-400"
                                >
                                    ...
                                </span>
                            );
                        }

                        const isActive = currentPage === token;
                        return (
                            <button
                                key={token}
                                onClick={() => goToPage(token)}
                                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                                    isActive
                                        ? 'border-primary-700 bg-primary-700 text-white shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:text-primary-700'
                                }`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {token}
                            </button>
                        );
                    })}

                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={isLastPage}
                        className={navButtonClass}
                        title="Next page"
                        aria-label="Go to next page"
                    >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                        onClick={() => goToPage(totalPages)}
                        disabled={isLastPage}
                        className={navButtonClass}
                        title="Last page"
                        aria-label="Go to last page"
                    >
                        <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                </nav>
            </div>
        </div>
    );
}
