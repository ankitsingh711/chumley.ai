import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { LogoWithText } from '../ui/Logo';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (text: string = inputValue) => {
        if (!text.trim()) return;

        // Add User Message
        const userMsg: Message = {
            id: Date.now().toString(),
            text: text,
            sender: 'user',
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI Response
        setTimeout(() => {
            let replyText = "I'm not sure about that, but I can help with requests, orders, and contracts.";
            const lowerText = text.toLowerCase();

            if (lowerText.includes('request') || lowerText.includes('approval')) {
                replyText = "You can view the status of your purchase requests on the 'Requests' page. Would you like me to take you there?";
            } else if (lowerText.includes('contract')) {
                replyText = "Contracts can be managed under the 'Strategic Sourcing' section. You can check expiring contracts there.";
            } else if (lowerText.includes('budget')) {
                replyText = "Your department's budget utilization is currently 45%. You have $50,000 remaining for this quarter.";
            } else if (lowerText.includes('supplier')) {
                replyText = "You can search for approved suppliers in the directory. Need help onboarding a new one?";
            } else if (lowerText.includes('password')) {
                replyText = "To reset your password, go to Settings > Security. Or I can send a reset link to your email.";
            }

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: replyText,
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex w-96 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-300 animate-in slide-in-from-bottom-10 fade-in backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between bg-primary-600 px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                        <LogoWithText classNameIcon="bg-transparent text-white" showText={false} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">ChumleyBot</h3>
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
                    className="relative flex items-center gap-2"
                >
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-gray-400"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="rounded-full bg-primary-600 p-2.5 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
