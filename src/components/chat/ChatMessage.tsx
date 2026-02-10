import { Bot, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export interface ChatMessageProps {
    message: {
        id: string;
        text: string;
        sender: 'user' | 'bot';
        timestamp: Date;
        type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary' | 'request_detail';
        data?: any;
    };
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isBot = message.sender === 'bot';

    const renderContent = () => {
        switch (message.type) {
            case 'requests_list':
                return (
                    <div className="space-y-2 mt-2">
                        {message.data.map((req: any) => (
                            <div key={req.id} className="bg-gray-50 p-2 rounded-lg text-xs border border-gray-100 flex justify-between items-center group cursor-pointer hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-semibold text-gray-900">Request #{req.id.slice(0, 8)}</p>
                                    <p className="text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {req.status}
                                </span>
                            </div>
                        ))}
                    </div>
                );

            case 'contracts_list':
                return (
                    <div className="space-y-2 mt-2">
                        {message.data.map((contract: any) => (
                            <div key={contract.id} className="bg-gray-50 p-2 rounded-lg text-xs border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                                <p className="font-semibold text-gray-900 truncate">{contract.title}</p>
                                <div className="flex justify-between mt-1 text-gray-500">
                                    <span>{contract.supplier?.name}</span>
                                    <span>Exp: {new Date(contract.endDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'spend_summary':
                const { totalSpent, remaining, percentUsed } = message.data;
                return (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-medium text-gray-500">Budget Used</span>
                            <span className="text-xs font-bold text-gray-900">{percentUsed}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div
                                className={`h-1.5 rounded-full ${percentUsed > 90 ? 'bg-red-500' : 'bg-primary-600'}`}
                                style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs">
                            <div>
                                <p className="text-gray-400">Spent</p>
                                <p className="font-semibold text-gray-900">${Number(totalSpent).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400">Remaining</p>
                                <p className="font-semibold text-green-600">${Number(remaining).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                );

            case 'request_detail':
                const request = message.data;
                return (
                    <div className="mt-3 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-semibold text-gray-900 text-xs">Request #{request.id.slice(0, 8)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${request.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                    request.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {request.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <div className="p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                <div>
                                    <p className="text-gray-500">Total Amount</p>
                                    <p className="font-semibold text-gray-900">${Number(request.totalAmount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Date</p>
                                    <p className="font-medium text-gray-900">{new Date(request.createdAt).toLocaleDateString()}</p>
                                </div>
                                {request.requester && (
                                    <div className="col-span-2">
                                        <p className="text-gray-500">Requested By</p>
                                        <p className="font-medium text-gray-900">{request.requester.name} <span className="text-gray-400">({request.requester.email})</span></p>
                                    </div>
                                )}
                            </div>

                            {request.reason && (
                                <div className="mb-3 text-xs">
                                    <p className="text-gray-500 mb-1">Reason</p>
                                    <p className="text-gray-800 italic bg-gray-50 p-2 rounded border border-gray-100">{request.reason}</p>
                                </div>
                            )}

                            {request.items && request.items.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2">Items</p>
                                    <div className="space-y-2">
                                        {request.items.map((item: any) => (
                                            <div key={item.id} className="text-xs border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                                <div className="flex justify-between font-medium">
                                                    <span className="text-gray-900">{item.description}</span>
                                                    <span>${Number(item.totalPrice).toLocaleString()}</span>
                                                </div>
                                                <div className="text-gray-500 flex justify-between mt-0.5">
                                                    <span>Qty: {item.quantity}</span>
                                                    <span>@ ${Number(item.unitPrice).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`flex w-full gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
            {isBot && (
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <Bot className="h-4 w-4" />
                </div>
            )}

            <div className={`flex flex-col max-w-[85%] ${isBot ? 'items-start' : 'items-end'}`}>
                <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm ${isBot
                        ? 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                        : 'bg-primary-600 text-white rounded-tr-none'
                        }`}
                >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {isBot && renderContent()}
                </div>
                <span className="mt-1 text-[10px] text-gray-400">
                    {format(message.timestamp, 'HH:mm')}
                </span>
            </div>

            {!isBot && (
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <UserIcon className="h-4 w-4" />
                </div>
            )}
        </div>
    );
}
