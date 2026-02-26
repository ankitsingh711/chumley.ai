import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Eye,
    Inbox,
    Mail,
    MessageCircle,
    MessageSquare,
    Phone,
    Send,
    Smartphone,
    X,
    type LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { suppliersApi } from '../../services/suppliers.service';
import {
    MessageMedium,
    type CreateMessageInput,
    type Message,
} from '../../types/api';

interface MessageSupplierModalProps {
    supplierId: string;
    supplierName: string;
    isOpen: boolean;
    onClose: () => void;
}

interface MediumVisual {
    label: string;
    icon: LucideIcon;
    badgeClass: string;
}

const MESSAGE_MEDIA_OPTIONS: MessageMedium[] = [
    MessageMedium.EMAIL,
    MessageMedium.PORTAL,
    MessageMedium.WHATSAPP,
    MessageMedium.SMS,
    MessageMedium.PHONE,
    MessageMedium.OTHER,
];

const MESSAGE_MEDIUM_VISUALS: Record<MessageMedium, MediumVisual> = {
    [MessageMedium.EMAIL]: {
        label: 'Email',
        icon: Mail,
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    [MessageMedium.PORTAL]: {
        label: 'Portal',
        icon: Inbox,
        badgeClass: 'border-primary-200 bg-primary-50 text-primary-700',
    },
    [MessageMedium.WHATSAPP]: {
        label: 'WhatsApp',
        icon: MessageCircle,
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    [MessageMedium.SMS]: {
        label: 'SMS',
        icon: Smartphone,
        badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    [MessageMedium.PHONE]: {
        label: 'Phone',
        icon: Phone,
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    [MessageMedium.OTHER]: {
        label: 'Other',
        icon: MessageSquare,
        badgeClass: 'border-slate-200 bg-slate-50 text-slate-700',
    },
};

const normalizeMessageMedium = (message: Message): MessageMedium => {
    const normalized = message.medium?.toUpperCase();
    if (normalized && MESSAGE_MEDIA_OPTIONS.includes(normalized as MessageMedium)) {
        return normalized as MessageMedium;
    }
    if (message.isFromUser && message.toAddress) {
        return MessageMedium.EMAIL;
    }
    return MessageMedium.PORTAL;
};

export function MessageSupplierModal({ supplierId, supplierName, isOpen, onClose }: MessageSupplierModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [subject, setSubject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedInboundMessage, setSelectedInboundMessage] = useState<Message | null>(null);
    const [incomingPopup, setIncomingPopup] = useState<Message | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const knownMessageIdsRef = useRef<Set<string>>(new Set());

    const getErrorMessage = (errorValue: unknown, fallback: string) => {
        if (typeof errorValue === 'object' && errorValue !== null) {
            const errorObject = errorValue as {
                response?: { data?: { error?: string } };
                message?: string;
            };

            if (typeof errorObject.response?.data?.error === 'string') {
                return errorObject.response.data.error;
            }

            if (typeof errorObject.message === 'string') {
                return errorObject.message;
            }
        }

        return fallback;
    };

    const fetchMessages = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setIsLoading(true);
        }

        try {
            const data = await suppliersApi.getMessages(supplierId);

            const nextIds = new Set(data.map((message) => message.id));
            const newIncomingMessages = data.filter(
                (message) => !message.isFromUser && !knownMessageIdsRef.current.has(message.id)
            );

            setMessages(data);

            if (options?.silent && newIncomingMessages.length > 0) {
                setIncomingPopup(newIncomingMessages[newIncomingMessages.length - 1]);
            }

            knownMessageIdsRef.current = nextIds;
        } catch (errorValue: unknown) {
            console.error('Failed to fetch messages:', errorValue);
            setError(getErrorMessage(errorValue, 'Failed to load messages'));
        } finally {
            if (!options?.silent) {
                setIsLoading(false);
            }
        }
    }, [supplierId]);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            knownMessageIdsRef.current = new Set();
            void fetchMessages();
        } else {
            setIncomingPopup(null);
        }
    }, [isOpen, fetchMessages]);

    useEffect(() => {
        if (!isOpen) return;

        const pollInterval = window.setInterval(() => {
            void fetchMessages({ silent: true });
        }, 5000);

        return () => {
            window.clearInterval(pollInterval);
        };
    }, [isOpen, fetchMessages]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            if (selectedInboundMessage) {
                setSelectedInboundMessage(null);
                return;
            }

            onClose();
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => textareaRef.current?.focus(), 120);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, selectedInboundMessage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!incomingPopup) return;
        const timeout = window.setTimeout(() => {
            setIncomingPopup(null);
        }, 4500);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [incomingPopup]);

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        setIsSending(true);
        setError(null);

        try {
            const messageData: CreateMessageInput = {
                content: newMessage.trim(),
                isFromUser: true,
                medium: MessageMedium.EMAIL,
            };

            if (messages.length === 0 && subject.trim()) {
                messageData.subject = subject.trim();
            }

            const sentMessage = await suppliersApi.sendMessage(supplierId, messageData);
            setMessages((prev) => [...prev, sentMessage]);
            setNewMessage('');
            setSubject('');
        } catch (errorValue: unknown) {
            console.error('Failed to send message:', errorValue);
            setError(getErrorMessage(errorValue, 'Failed to send message'));
        } finally {
            setIsSending(false);
        }
    };

    const handleSendMessage = async (event: React.FormEvent) => {
        event.preventDefault();
        await sendMessage();
    };

    const handleTextareaKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            await sendMessage();
        }
    };

    const getSupplierInitials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'S';
        return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
    };

    const formatMessageTime = (date: string) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    };

    const formatConversationStart = (date: string) => {
        return new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(date));
    };

    const getMetadataEntries = (message: Message): Array<[string, unknown]> => {
        if (!message.metadata || typeof message.metadata !== 'object' || Array.isArray(message.metadata)) {
            return [];
        }
        return Object.entries(message.metadata);
    };

    const formatMetadataValue = (value: unknown): string => {
        if (value === null || typeof value === 'undefined') {
            return '-';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="animate-in fade-in zoom-in-95 duration-200 flex h-[85vh] min-h-[560px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-primary-50/30 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-700 font-semibold text-white shadow-sm">
                                {getSupplierInitials(supplierName)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900">Message Supplier</h2>
                                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                                        {messages.length} messages
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600">{supplierName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:text-slate-700"
                                aria-label="Close message modal"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {incomingPopup && (() => {
                    const medium = normalizeMessageMedium(incomingPopup);
                    const visual = MESSAGE_MEDIUM_VISUALS[medium];
                    const MediumIcon = visual.icon;

                    return (
                        <div className="animate-in slide-in-from-top-2 fade-in px-6 pt-3">
                            <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                                <div>
                                    <p className="font-semibold text-emerald-900">New supplier reply received</p>
                                    <p className="mt-0.5 text-emerald-800 line-clamp-1">{incomingPopup.content}</p>
                                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                        <MediumIcon className="h-3 w-3" />
                                        {visual.label}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedInboundMessage(incomingPopup);
                                        setIncomingPopup(null);
                                    }}
                                    className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    );
                })()}

                <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/70 via-white to-slate-50/70 px-4 py-4 sm:px-6 sm:py-5">
                    {error && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="space-y-3 py-4">
                            <div className="h-16 w-3/5 animate-pulse rounded-2xl bg-slate-200" />
                            <div className="ml-auto h-16 w-2/3 animate-pulse rounded-2xl bg-primary-100" />
                            <div className="h-14 w-1/2 animate-pulse rounded-2xl bg-slate-200" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex h-full min-h-[320px] items-center justify-center">
                            <div className="max-w-md rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <p className="text-base font-semibold text-slate-900">No messages yet</p>
                                <p className="mt-1 text-sm text-slate-500">Start the conversation with {supplierName} below.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages[0]?.subject && (
                                <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p>
                                    <p className="mt-1 text-sm font-medium text-slate-900">{messages[0].subject}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Conversation started {formatConversationStart(messages[0].createdAt)}
                                    </p>
                                </div>
                            )}

                            {messages.map((message, index) => {
                                const medium = normalizeMessageMedium(message);
                                const mediumVisual = MESSAGE_MEDIUM_VISUALS[medium];
                                const MediumIcon = mediumVisual.icon;

                                return (
                                    <div
                                        key={message.id}
                                        className="animate-in fade-in slide-in-from-bottom-1 mb-4"
                                        style={{ animationDelay: `${index * 35}ms` }}
                                    >
                                        <div className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex max-w-[86%] flex-col sm:max-w-[72%] ${message.isFromUser ? 'items-end' : 'items-start'}`}>
                                                <div
                                                    className={`rounded-2xl px-4 py-3 shadow-sm ${message.isFromUser
                                                        ? 'rounded-br-md bg-gradient-to-br from-primary-600 to-primary-700 text-white'
                                                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-900'
                                                        }`}
                                                >
                                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1 text-[11px] text-slate-500">
                                                    <span>{message.user?.name || (message.isFromUser ? 'You' : supplierName)}</span>
                                                    <span>•</span>
                                                    <span>{formatMessageTime(message.receivedAt || message.createdAt)}</span>
                                                    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${mediumVisual.badgeClass}`}>
                                                        <MediumIcon className="h-3 w-3" />
                                                        {mediumVisual.label}
                                                    </span>
                                                </div>
                                                {!message.isFromUser && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedInboundMessage(message)}
                                                        className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 transition-colors hover:bg-primary-50"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                        View Details
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
                    <form onSubmit={handleSendMessage} className="space-y-3">
                        {messages.length === 0 && (
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Subject (optional)
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(event) => setSubject(event.target.value)}
                                    placeholder="Add a subject for the first message"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                        )}

                        <div className="flex items-end gap-3">
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(event) => setNewMessage(event.target.value)}
                                onKeyDown={handleTextareaKeyDown}
                                placeholder="Type your message..."
                                className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                rows={3}
                                disabled={isSending}
                            />
                            <Button
                                type="submit"
                                className="h-[52px] min-w-[116px] rounded-xl bg-primary-600 px-4 hover:bg-primary-700"
                                isLoading={isSending}
                                disabled={isSending || !newMessage.trim()}
                            >
                                {!isSending && <Send className="mr-2 h-4 w-4" />}
                                Send Email
                            </Button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Press Enter to send, Shift+Enter for a new line. Messages are sent via supplier email when available.
                        </p>
                    </form>
                </div>
            </div>

            {selectedInboundMessage && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4"
                    onClick={(event) => {
                        event.stopPropagation();
                        setSelectedInboundMessage(null);
                    }}
                >
                    <div
                        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const medium = normalizeMessageMedium(selectedInboundMessage);
                                    const visual = MESSAGE_MEDIUM_VISUALS[medium];
                                    const MediumIcon = visual.icon;
                                    return (
                                        <>
                                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${visual.badgeClass}`}>
                                                <MediumIcon className="h-3.5 w-3.5" />
                                                {visual.label}
                                            </span>
                                            <h3 className="text-lg font-semibold text-slate-900">Incoming Message Details</h3>
                                        </>
                                    );
                                })()}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedInboundMessage(null)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 px-5 py-4">
                            <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
                                <p><span className="font-semibold text-slate-700">From:</span> {selectedInboundMessage.fromAddress || 'N/A'}</p>
                                <p><span className="font-semibold text-slate-700">To:</span> {selectedInboundMessage.toAddress || 'N/A'}</p>
                                <p><span className="font-semibold text-slate-700">Source:</span> {selectedInboundMessage.source || 'N/A'}</p>
                                <p><span className="font-semibold text-slate-700">Channel ID:</span> {selectedInboundMessage.channelMessageId || 'N/A'}</p>
                                <p><span className="font-semibold text-slate-700">Received:</span> {formatConversationStart(selectedInboundMessage.receivedAt || selectedInboundMessage.createdAt)}</p>
                                <p><span className="font-semibold text-slate-700">Logged:</span> {formatConversationStart(selectedInboundMessage.createdAt)}</p>
                            </div>

                            {selectedInboundMessage.subject && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p>
                                    <p className="mt-1 text-sm font-medium text-slate-900">{selectedInboundMessage.subject}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p>
                                <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">{selectedInboundMessage.content}</p>
                                </div>
                            </div>

                            {getMetadataEntries(selectedInboundMessage).length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</p>
                                    <div className="mt-1 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        {getMetadataEntries(selectedInboundMessage).map(([key, value]) => (
                                            <div key={key} className="flex flex-col gap-1 border-b border-slate-200 pb-2 text-sm last:border-b-0 last:pb-0 sm:flex-row sm:justify-between">
                                                <span className="font-semibold text-slate-600">{key}</span>
                                                <span className="break-all text-slate-900">{formatMetadataValue(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
