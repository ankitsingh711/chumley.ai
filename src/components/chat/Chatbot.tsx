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
    CornerDownLeft,
    RotateCcw
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
    data?: unknown;
    attachment?: {
        name: string;
        url: string;
    };
}

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

const createInitialMessage = (): Message => ({
    id: `welcome-${Date.now()}`,
    text: "Hi there! I'm your procurement assistant. How can I help you today?",
    sender: 'bot',
    timestamp: new Date(),
});

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
    const [messages, setMessages] = useState<Message[]>([createInitialMessage()]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [attachment, setAttachment] = useState<{ name: string; url: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [lastContextAttachment, setLastContextAttachment] = useState<string | undefined>(undefined);
    const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

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
        } catch {
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
    const resetConversation = () => {
        setMessages([createInitialMessage()]);
        setInputValue('');
        setAttachment(null);
        setIsTyping(false);
        setLastContextAttachment(undefined);
        inputRef.current?.focus();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-3 left-3 right-3 z-50 flex h-[min(78vh,38rem)] max-h-[38rem] flex-col overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-[0_34px_95px_-38px_rgba(15,23,42,0.7)] sm:bottom-6 sm:left-auto sm:right-5 sm:h-[min(80vh,40rem)] sm:max-h-[40rem] sm:w-[23.5rem] md:w-[24.5rem] lg:w-[26rem]">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-white/20 bg-gradient-to-br from-[#0f2d67] via-primary-700 to-sky-600 px-4 py-3.5 text-white sm:px-5 sm:py-4">
                <div className="pointer-events-none absolute -left-12 top-4 h-28 w-28 rounded-full bg-white/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-14 top-0 h-32 w-32 rounded-full bg-cyan-300/30 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
                                <img src="/aspect-favicon.svg" alt="Aspect logo" className="h-8 w-8 object-contain" />
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-[#1c3f82]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">Procurement Copilot</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="truncate text-lg font-semibold tracking-tight">Aspect Bot</h3>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/95">
                                        <Sparkles className="h-3 w-3" />
                                        Smart
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-2 max-w-xs text-[11px] text-white/85 sm:text-xs">Get instant answers on requests, orders, suppliers, contracts, and spend.</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
                            <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/90">Secure Workspace</span>
                            <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-300/20 px-2.5 py-1 text-[10px] font-medium text-white">Online now</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={resetConversation}
                            className="inline-flex h-9 items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20"
                            aria-label="Start new chat"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            New
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-full border border-white/30 bg-white/10 p-2 text-white/90 transition-colors hover:bg-white/20 hover:text-white"
                            aria-label="Close chatbot"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="relative flex flex-1 flex-col overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-100/70 px-3.5 py-3.5 sm:px-5 sm:py-4">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.07),transparent_45%)]" />
                <div className="relative flex-1 space-y-4 pb-1">
                    <div className="flex justify-center">
                        <span className="rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-slate-500 shadow-sm">
                            {todayLabel}
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
                <div className="border-t border-slate-200/80 bg-slate-50/80 px-3.5 py-3 sm:px-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Quick actions</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {QUICK_REPLIES.map((reply) => {
                            const Icon = reply.icon;
                            return (
                                <button
                                    key={reply.label}
                                    onClick={() => handleSend(reply.label)}
                                    className="group flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-[0_12px_20px_-22px_rgba(15,23,42,0.8)] transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/60 sm:py-2.5"
                                >
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-primary-700 ring-1 ring-slate-200 transition-colors group-hover:bg-primary-600 group-hover:text-white">
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
            <div className="border-t border-slate-200/80 bg-white px-3.5 pb-3.5 pt-2.5 sm:px-5 sm:pb-4 sm:pt-3">
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
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-primary-700 ring-1 ring-slate-200">
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

                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
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
                            className="rounded-xl bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 p-2.5 text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Send message"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-400">
                        <span>{attachment ? 'Attachment ready' : 'Ask about requests, orders, suppliers, contracts, or spend'}</span>
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
