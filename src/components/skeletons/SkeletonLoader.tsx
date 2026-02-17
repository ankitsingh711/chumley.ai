import { useLocation } from 'react-router-dom';
import { DashboardSkeleton } from './DashboardSkeleton';
import { SuppliersSkeleton } from './SuppliersSkeleton';
import { SupplierProfileSkeleton } from './SupplierProfileSkeleton';
import { RequestsSkeleton } from './RequestsSkeleton';
import { CreateRequestSkeleton } from './CreateRequestSkeleton';
import { PurchaseOrdersSkeleton } from './PurchaseOrdersSkeleton';
import { ReportsSkeleton } from './ReportsSkeleton';
import { ContractsSkeleton } from './ContractsSkeleton';
import { CatalogSkeleton } from './CatalogSkeleton';
import { DepartmentBudgetsSkeleton } from './DepartmentBudgetsSkeleton';
import { UserPermissionsSkeleton } from './UserPermissionsSkeleton';
import { GenericSkeleton } from './GenericSkeleton';

/**
 * Smart skeleton loader that shows the appropriate skeleton based on current route
 */
export function SkeletonLoader() {
    const location = useLocation();
    const path = location.pathname;

    // Match route to appropriate skeleton
    if (path === '/' || path === '/dashboard') return <DashboardSkeleton />;
    if (path === '/suppliers') return <SuppliersSkeleton />;
    if (path.startsWith('/suppliers/')) return <SupplierProfileSkeleton />;
    if (path === '/requests') return <RequestsSkeleton />;
    if (path === '/requests/new') return <CreateRequestSkeleton />;
    if (path === '/orders') return <PurchaseOrdersSkeleton />;
    if (path === '/reports') return <ReportsSkeleton />;
    if (path === '/contracts') return <ContractsSkeleton />;
    if (path === '/catalog') return <CatalogSkeleton />;
    if (path === '/budgets') return <DepartmentBudgetsSkeleton />;
    if (path === '/settings') return <UserPermissionsSkeleton />;

    // Fallback to generic skeleton for unmatched routes
    return <GenericSkeleton />;
}
