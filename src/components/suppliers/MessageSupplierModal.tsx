import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { suppliersApi } from '../../services/suppliers.service';
import type { Message, CreateMessageInput } from '../../types/api';

interface MessageSupplierModalProps {
    supplierId: string;
    supplierName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function MessageSupplierModal({ supplierId, supplierName, isOpen, onClose }: MessageSupplierModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [subject, setSubject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchMessages();
        }
    }, [isOpen, supplierId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await suppliersApi.getMessages(supplierId);
            setMessages(data);
        } catch (err: any) {
            console.error('Failed to fetch messages:', err);
            setError('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setIsSending(true);
        setError(null);

        try {
            const messageData: CreateMessageInput = {
                content: newMessage.trim(),
                isFromUser: true,
            };

            // Add subject only for first message
            if (messages.length === 0 && subject.trim()) {
                messageData.subject = subject.trim();
            }

            const sentMessage = await suppliersApi.sendMessage(supplierId, messageData);
            setMessages([...messages, sentMessage]);
            setNewMessage('');
            setSubject('');
        } catch (err: any) {
            console.error('Failed to send message:', err);
            setError(err.response?.data?.error || 'Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Message Supplier</h2>
                        <p className="text-sm text-gray-500">{supplierName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-gray-500">Loading messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-gray-500">No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((message, index) => (
                                <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2">
                                    {/* Show subject for first message */}
                                    {index === 0 && message.subject && (
                                        <div className="text-sm font-semibold text-gray-900 mb-2 pb-2 border-b">
                                            Subject: {message.subject}
                                        </div>
                                    )}

                                    <div className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] ${message.isFromUser ? 'order-2' : 'order-1'}`}>
                                            <div className={`rounded-lg px-4 py-2 ${message.isFromUser
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                                }`}>
                                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 px-1">
                                                {message.user?.name || 'Unknown'} • {new Date(message.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="space-y-3">
                        {/* Subject field - only show for first message */}
                        {messages.length === 0 && (
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Subject (optional)"
                                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            />
                        )}

                        {/* Message input */}
                        <div className="flex gap-2">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                                rows={2}
                                disabled={isSending}
                            />
                            <Button
                                type="submit"
                                className="bg-primary-600 hover:bg-primary-600 px-4"
                                disabled={isSending || !newMessage.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
