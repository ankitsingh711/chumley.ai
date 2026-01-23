import { Wallet, FileClock, ShoppingBag } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { BudgetTracker } from '../components/dashboard/BudgetTracker';
import { RequestBreakdown } from '../components/dashboard/RequestBreakdown';
import { StrategicSourcing } from '../components/dashboard/StrategicSourcing';
import { Button } from '../components/ui/Button';

export default function Dashboard() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    {/* Placeholder for potential breadcrumb or greeting if needed */}
                </div>
                <div className="flex gap-3">
                    {/* Buttons could go here if header doesn't have them */}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Spend (MTD)"
                    value="$428,500"
                    trend={{ value: '12.4%', isPositive: true, label: 'vs last year' }}
                    icon={Wallet}
                    color="blue"
                />
                <StatCard
                    title="Pending Approvals"
                    value="12"
                    trend={{ value: 'Active', isPositive: true, label: '8 require immediate action' }}
                    icon={FileClock}
                    color="yellow"
                />
                <StatCard
                    title="Active POs"
                    value="24"
                    trend={{ value: '2.1%', isPositive: false, label: 'vs last month' }}
                    icon={ShoppingBag}
                    color="green"

                />
                {/* Placeholder for 4th card if needed, or layout adjustment */}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Budget Tracking (2 cols wide) */}
                <div className="lg:col-span-2">
                    <BudgetTracker />
                </div>

                {/* Right Column: Breakdown & Sourcing */}
                <div className="space-y-6">
                    <RequestBreakdown />
                    <StrategicSourcing />
                </div>
            </div>

            {/* Bottom Section: Recent Purchase Requests */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Recent Purchase Requests</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">Filter</Button>
                        <Button variant="outline" size="sm">Export</Button>
                    </div>
                </div>
                <div className="p-6">
                    {/* Table Placeholder - Will implement full table component later */}
                    <div className="text-sm text-gray-500 text-center py-8">
                        Request List Table Placeholder
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <Button variant="primary" className="w-full sm:w-auto">
                        + New Request
                    </Button>
                </div>
            </div>
        </div>
    );
}
