import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export function StrategicSourcing() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col justify-between rounded-xl bg-primary-700 p-6 text-white shadow-sm">
            <div>
                <h3 className="text-lg font-semibold">Strategic Sourcing</h3>
                <div className="mt-4 h-24 rounded-lg bg-primary-800/50 border border-primary-600/30"></div>
            </div>
            <Button
                variant="secondary"
                className="mt-4 w-full bg-white text-primary-700 hover:bg-primary-50"
                onClick={() => navigate('/contracts')}
            >
                MANAGE CONTRACTS
            </Button>
        </div>
    );
}
