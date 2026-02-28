import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileSignature, ShieldCheck, TrendingUp } from 'lucide-react';

export function StrategicSourcing() {
    const navigate = useNavigate();

    return (
        <section className="relative overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-5 text-white shadow-sm sm:p-6">
            <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-14 left-6 h-40 w-40 rounded-full bg-accent-400/20 blur-2xl" />

            <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                    <FileSignature className="h-3.5 w-3.5" /> Strategic Sourcing
                </div>

                <h3 className="mt-3 text-xl font-semibold">Strengthen Contract Coverage</h3>
                <p className="mt-2 text-sm text-primary-100">
                    Centralize supplier agreements, monitor renewals, and reduce spend leakage through controlled sourcing.
                </p>

                <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-lg border border-white/15 bg-white/10 p-2.5">
                        <p className="font-semibold">12</p>
                        <p className="mt-1 text-primary-100">Contracts expiring soon</p>
                    </div>
                    <div className="rounded-lg border border-white/15 bg-white/10 p-2.5">
                        <p className="font-semibold">96%</p>
                        <p className="mt-1 text-primary-100">Supplier compliance</p>
                    </div>
                    <div className="rounded-lg border border-white/15 bg-white/10 p-2.5">
                        <p className="font-semibold">+8.2%</p>
                        <p className="mt-1 text-primary-100">Savings opportunity</p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-primary-100">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-1"><ShieldCheck className="h-3.5 w-3.5" /> Compliance Alerts</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-1"><TrendingUp className="h-3.5 w-3.5" /> Price Benchmarking</span>
                </div>

                <Button
                    variant="secondary"
                    className="mt-5 w-full bg-white text-primary-800 hover:bg-primary-50"
                    onClick={() => navigate('/contracts')}
                >
                    Open Contract Workspace <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </section>
    );
}
