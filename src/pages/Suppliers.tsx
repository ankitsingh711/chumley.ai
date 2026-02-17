import { useEffect, useState } from 'react';
import { Plus, LayoutGrid, List as ListIcon, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SupplierCard, type Supplier as CardSupplier } from '../components/suppliers/SupplierCard';
import { suppliersApi } from '../services/suppliers.service';
import { AddSupplierModal } from '../components/suppliers/AddSupplierModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { pdfService } from '../services/pdf.service';
import { SuppliersSkeleton } from '../components/skeletons/SuppliersSkeleton';
import { Pagination } from '../components/Pagination';
import { isPaginatedResponse } from '../types/pagination';

import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/api';

export default function Suppliers() {
    const { user } = useAuth();
    // SYSTEM_ADMIN, SENIOR_MANAGER, and MANAGER can add suppliers directly
    const isRestricted = user?.role !== UserRole.SYSTEM_ADMIN &&
        user?.role !== UserRole.SENIOR_MANAGER &&
        user?.role !== UserRole.MANAGER;

    const [suppliers, setSuppliers] = useState<CardSupplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const [activeFilter, setActiveFilter] = useState('All Vendors');

    const categories = ['Software', 'Office Supplies', 'Hardware', 'Marketing', 'Shipping & Logistics', 'Other'];
    const filterOptions = ['All Vendors', ...categories];

    useEffect(() => {
        fetchSuppliers();
    }, [currentPage]); // Refetch when page changes

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const response = await suppliersApi.getAll(currentPage, limit);

            let supplierData: any[];
            if (isPaginatedResponse(response)) {
                // New paginated response
                supplierData = response.data;
                setTotal(response.meta.total);
                setTotalPages(response.meta.totalPages);
                setCurrentPage(response.meta.page);
            } else {
                // Old non-paginated response (fallback)
                supplierData = response;
                setTotal(response.length);
                setTotalPages(1);
            }

            const mappedData: CardSupplier[] = supplierData.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                status: (['Preferred', 'Standard', 'Review Pending'].includes(s.status) ? s.status : 'Standard') as any,
                logoColor: 'bg-primary-600',
                contact: {
                    name: s.contactName || 'Unknown',
                    role: 'Representative',
                    image: s.logoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.contactName || s.name),
                },
                stats: {
                    activeOrders: s.activeOrdersCount || s.stats?.activeOrders || 0,
                    totalSpend: s.totalSpend ? `£${s.totalSpend.toLocaleString()}` : (s.stats?.totalSpend ? `£${s.stats.totalSpend.toLocaleString()}` : '£0'),
                },
                lastOrder: s.lastOrderDate ? new Date(s.lastOrderDate).toLocaleDateString() : 'No orders yet'
            }));
            setSuppliers(mappedData);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter suppliers based on active selection
    const filteredSuppliers = activeFilter === 'All Vendors'
        ? suppliers
        : suppliers.filter(s => s.category === activeFilter);

    const handleOpenModal = () => {
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
    };

    const handleSupplierAdded = (newSupplier: any) => {
        if (isRestricted) {
            // Determine what to do for restricted user - just close and show toast/alert?
            // For now, we won't add it to the list immediately if it's pending review and filtering excludes it,
            // or we add it with "Review Pending" status.
            const mappedNew: CardSupplier = {
                id: newSupplier.id,
                name: newSupplier.name,
                category: newSupplier.category,
                status: 'Review Pending',
                logoColor: 'bg-primary-600',
                contact: {
                    name: newSupplier.contactName || 'Unknown',
                    role: 'Representative',
                    image: newSupplier.logoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(newSupplier.contactName || newSupplier.name),
                },
                stats: {
                    activeOrders: 0,
                    totalSpend: '£0',
                },
                lastOrder: 'New',
            };
            setSuppliers([mappedNew, ...suppliers]);
            setShowSuccessModal(true);
        } else {
            const mappedNew: CardSupplier = {
                id: newSupplier.id,
                name: newSupplier.name,
                category: newSupplier.category,
                status: (['Preferred', 'Standard', 'Review Pending'].includes(newSupplier.status) ? newSupplier.status : 'Standard') as any,
                logoColor: 'bg-primary-600',
                contact: {
                    name: newSupplier.contactName || 'Unknown',
                    role: 'Representative',
                    image: newSupplier.logoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(newSupplier.contactName || newSupplier.name),
                },
                stats: {
                    activeOrders: 0,
                    totalSpend: '£0',
                },
                lastOrder: 'New',
            };
            setSuppliers([...suppliers, mappedNew]);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await suppliersApi.approve(id);
            // Update local state
            setSuppliers(suppliers.map(s =>
                s.id === id ? { ...s, status: 'Standard' } : s
            ));
        } catch (error) {
            console.error('Failed to approve supplier:', error);
            alert('Failed to approve supplier. You may not have permission.');
        }
    };

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

    const handleReject = (id: string) => {
        setSelectedSupplierId(id);
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!selectedSupplierId) return;

        try {
            await suppliersApi.reject(selectedSupplierId);
            // Remove from list
            setSuppliers(prev => prev.filter(s => s.id !== selectedSupplierId));
            setShowRejectModal(false);
            setSelectedSupplierId(null);
        } catch (error) {
            console.error('Failed to reject supplier:', error);
            alert('Failed to reject supplier. You may not have permission.');
            setShowRejectModal(false);
        }
    };

    const handleExportPDF = () => {
        const headers = ['Name', 'Category', 'Status', 'Contact', 'Active Orders', 'Total Spend'];
        const rows = filteredSuppliers.map(s => [
            s.name,
            s.category,
            s.status,
            s.contact.name,
            s.stats.activeOrders.toString(),
            s.stats.totalSpend
        ]);

        pdfService.exportToPDF(
            'Supplier Directory',
            headers,
            rows,
            'supplier_directory'
        );
    };

    if (loading) {
        return <SuppliersSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Supplier Directory</h1>
                    <p className="text-sm text-gray-500">Manage approved vendors, track performance, and monitor spend.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" /> Export PDF</Button>
                    <Button onClick={handleOpenModal}>
                        <Plus className="mr-2 h-4 w-4" />
                        {isRestricted ? 'Request New Supplier' : 'Add New Supplier'}
                    </Button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    {filterOptions.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeFilter === filter
                                ? 'bg-primary-800 text-white'
                                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                        <button className="p-1.5 rounded bg-gray-100 text-gray-900"><LayoutGrid className="h-4 w-4" /></button>
                        <button className="p-1.5 rounded text-gray-400 hover:text-gray-600"><ListIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(supplier => (
                    <SupplierCard
                        key={supplier.id}
                        supplier={supplier}
                        onApprove={
                            (user?.role === UserRole.SYSTEM_ADMIN ||
                                user?.role === UserRole.SENIOR_MANAGER ||
                                user?.role === UserRole.MANAGER)
                                ? handleApprove
                                : undefined
                        }
                        onReject={
                            (user?.role === UserRole.SYSTEM_ADMIN ||
                                user?.role === UserRole.SENIOR_MANAGER ||
                                user?.role === UserRole.MANAGER)
                                ? handleReject
                                : undefined
                        }
                    />
                ))}

                {/* Add New Quick Card */}
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 flex flex-col items-center justify-center text-center hover:border-primary-300 hover:bg-primary-50/50 transition-colors cursor-pointer group h-full min-h-[300px]"
                    onClick={handleOpenModal}
                >
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{isRestricted ? 'Request New Supplier' : 'Add New Supplier'}</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-[200px]">{isRestricted ? 'Submit a request to add a new vendor' : 'Onboard a new vendor to your approved list'}</p>
                </div>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="mt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        total={total}
                        limit={limit}
                        onPageChange={(page) => setCurrentPage(page)}
                    />
                </div>
            )}

            {/* Add Supplier Modal */}
            <AddSupplierModal
                isOpen={showAddModal}
                onClose={handleCloseModal}
                onSuccess={handleSupplierAdded}
                isRestricted={isRestricted}
            />

            <ConfirmationModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                onConfirm={() => setShowSuccessModal(false)}
                title="Request Sent"
                message="Your supplier request has been sent for approval. You will be notified once it is reviewed."
                confirmText="OK"
                variant="success"
                showCancel={false}
            />

            <ConfirmationModal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                onConfirm={confirmReject}
                title="Reject Supplier"
                message="Are you sure you want to reject this supplier? This action cannot be undone."
                confirmText="Reject Supplier"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
