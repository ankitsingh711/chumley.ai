import { useState, useRef, useEffect } from 'react';
import {
    X,
    Send,
    Paperclip,
    FileText,
    Loader2,
    Sparkles,
    ClipboardList,
    CirclePlus,
    FileSearch,
    ShieldCheck,
    Bot,
    CornerDownLeft
} from 'lucide-react';
import { uploadApi } from '../../services/upload.service';
import { ChatMessage } from './ChatMessage';
import { chatApi } from '../../services/chat.service';


interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary' | 'request_detail' | 'orders_list' | 'suppliers_list' | 'overview';
    data?: any;
    attachment?: {
        name: string;
        url: string;
    };
}

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

const QUICK_REPLIES = [
    {
        label: "Check request status",
        hint: "Track approvals and next steps",
        icon: ClipboardList,
    },
    {
        label: "Create new request",
        hint: "Start a new purchase flow",
        icon: CirclePlus,
    },
    {
        label: "View recent contracts",
        hint: "Find active vendor agreements",
        icon: FileSearch,
    },
    {
        label: "How do I reset my password?",
        hint: "Get account and access help",
        icon: ShieldCheck,
    },
];

export function Chatbot({ isOpen, onClose }: ChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Hi there! I'm your procurement assistant. How can I help you today?",
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [attachment, setAttachment] = useState<{ name: string; url: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [lastContextAttachment, setLastContextAttachment] = useState<string | undefined>(undefined);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [isOpen, messages, isTyping]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadApi.uploadFile(file);
            setAttachment({
                name: file.name,
                url: url
            });
            // Focus back on input
        } catch (error) {
            console.error('Failed to upload', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async (text: string = inputValue) => {
        if (!text.trim() && !attachment) return;

        // Add User Message
        const userMsg: Message = {
            id: Date.now().toString(),
            text: text,
            sender: 'user',
            timestamp: new Date(),
            attachment: attachment || undefined
        };

        // Capture current attachment to use in API call
        const currentAttachment = attachment;

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setAttachment(null);
        setIsTyping(true);

        try {
            const historyPayload = [...messages.slice(-12), userMsg].map((message) => ({
                sender: message.sender,
                text: message.text,
                type: message.type
            }));

            const response = await chatApi.sendMessage(
                text,
                currentAttachment?.url,
                lastContextAttachment,
                historyPayload
            );

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.text,
                sender: 'bot',
                timestamp: new Date(),
                type: response.type,
                data: response.data
            };

            // If bot returns an attachment in data (simulated), update context
            if (response.data?.attachmentUrl) {
                setLastContextAttachment(response.data.attachmentUrl);
            }
            // Or if user just uploaded one, set that as context for next turn
            else if (currentAttachment) {
                setLastContextAttachment(currentAttachment.url);
            }

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting to the server. Please try again later.",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const canSend = Boolean(inputValue.trim() || attachment);
    const showQuickReplies = messages.length <= 2 && !isTyping;

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex h-[min(80vh,42rem)] max-h-[42rem] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.5)] sm:bottom-6 sm:left-auto sm:right-6 sm:w-[24rem] sm:max-w-[24rem]">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-sky-600 px-5 py-4 text-white">
                <div className="pointer-events-none absolute -left-8 top-6 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
                <div className="pointer-events-none absolute -right-10 top-2 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden">
                            <img src="/aspect-favicon.svg" alt="Aspect logo" className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="truncate text-base font-semibold tracking-tight">Aspect Bot</h3>
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white/95 ring-1 ring-white/30">
                                    <Sparkles className="h-3 w-3" />
                                    Smart
                                </span>
                            </div>
                            <p className="text-xs text-white/85">Procurement assistant for requests, suppliers, and contracts</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                        aria-label="Close chatbot"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="relative flex flex-1 flex-col overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-100/60 px-4 py-4 sm:px-5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent" />
                <div className="relative flex-1 space-y-4">
                    <div className="flex justify-center">
                        <span className="rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 shadow-sm">
                            Today
                        </span>
                    </div>
                    {messages.map(msg => (
                        <ChatMessage key={msg.id} message={msg} />
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                                    <Bot className="h-3.5 w-3.5" />
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                                </div>
                                <span className="text-xs font-medium text-slate-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Quick Replies */}
            {showQuickReplies && (
                <div className="border-t border-slate-200 bg-white/95 px-4 py-3 sm:px-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Quick actions</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {QUICK_REPLIES.map((reply) => {
                            const Icon = reply.icon;
                            return (
                                <button
                                    key={reply.label}
                                    onClick={() => handleSend(reply.label)}
                                    className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/70"
                                >
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm ring-1 ring-slate-200/70 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-[13px] font-semibold text-slate-800">{reply.label}</span>
                                        <span className="block truncate text-[11px] text-slate-500">{reply.hint}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-slate-200/80 bg-white px-4 pb-4 pt-3 sm:px-5">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="relative"
                >
                    {/* Attachment Preview */}
                    {attachment && (
                        <div className="mb-2 flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white text-primary-700 ring-1 ring-slate-200">
                                <FileText className="h-3.5 w-3.5" />
                            </span>
                            <span className="flex-1 truncate font-medium text-slate-700">{attachment.name}</span>
                            <button
                                type="button"
                                onClick={() => setAttachment(null)}
                                className="rounded p-0.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                aria-label="Remove attachment"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={`rounded-xl p-2 transition-colors ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-primary-700'}`}
                            aria-label="Attach file"
                        >
                            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <input
                            type="text"
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={attachment ? "Ask a question about this file..." : "Type a message..."}
                            className="flex-1 border-none bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={!canSend}
                            className="rounded-xl bg-gradient-to-r from-primary-700 to-primary-600 p-2.5 text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Send message"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-400">
                        <span>{attachment ? 'Attachment ready' : 'Ask about requests, orders, suppliers, or spend'}</span>
                        <span className="inline-flex items-center gap-1">
                            <CornerDownLeft className="h-3 w-3" />
                            Enter to send
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
}
