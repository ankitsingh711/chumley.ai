import { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, FileText, Loader2 } from 'lucide-react';
import { uploadApi } from '../../services/upload.service';
import { ChatMessage } from './ChatMessage';
import { chatApi } from '../../services/chat.service';


interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary' | 'request_detail';
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
    "Check request status",
    "Create new request",
    "View recent contracts",
    "How do I reset my password?",
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
    const [lastContextAttachment, setLastContextAttachment] = useState<string | undefined>(undefined);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);



    // ... (keep interface Message but upgrade it)

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
            const response = await chatApi.sendMessage(
                text,
                currentAttachment?.url,
                lastContextAttachment
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

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex w-96 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-300 animate-in slide-in-from-bottom-10 fade-in backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between bg-primary-600 px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center">
                        <img src="/chatbot-icon.png" alt="Aspect Bot" className="h-10 w-10 rounded-lg" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Aspect Bot</h3>
                        <p className="text-[10px] text-primary-100 opacity-90">Always here to help</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/20 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex h-96 flex-col overflow-y-auto bg-gray-50/50 p-4">
                <div className="flex-1 space-y-4">
                    {messages.map(msg => (
                        <ChatMessage key={msg.id} message={msg} />
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="flex items-center gap-1 rounded-2xl rounded-tl-none bg-white px-4 py-3 shadow-sm border border-gray-100">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Quick Replies */}
            {messages.length < 3 && !isTyping && (
                <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-thin">
                    {QUICK_REPLIES.map((reply, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(reply)}
                            className="whitespace-nowrap rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="border-t bg-white p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="relative"
                >
                    {/* Attachment Preview */}
                    {attachment && (
                        <div className="absolute bottom-full left-0 mb-2 bg-gray-100 rounded-lg p-2 flex items-center gap-2 border border-gray-200 text-xs w-full max-w-[200px]">
                            <FileText className="h-3 w-3 text-primary-600" />
                            <span className="truncate flex-1 font-medium">{attachment.name}</span>
                            <button
                                type="button"
                                onClick={() => setAttachment(null)}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={`p-2 rounded-full transition-colors ${isUploading ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-primary-600'}`}
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
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={attachment ? "Ask a question about this file..." : "Type a message..."}
                            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() && !attachment}
                            className="rounded-full bg-primary-600 p-2.5 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
